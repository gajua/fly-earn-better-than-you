-- Privacy-safe aggregate stats + 90-day retention helper.
create or replace function public.global_learning_public_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'observationCount', (select count(*)::bigint from public.learning_observations),
    'publishedPresetVersion', (
      select version from public.global_calibration_presets
      where status = 'published'
      order by published_at desc nulls last
      limit 1
    ),
    'lastCalibrationAt', (
      select published_at from public.global_calibration_presets
      where status = 'published'
      order by published_at desc nulls last
      limit 1
    )
  );
$$;

revoke all on function public.global_learning_public_stats() from public;
grant execute on function public.global_learning_public_stats() to anon, authenticated;

create or replace function public.purge_learning_observations_older_than_90_days()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted integer;
begin
  delete from public.learning_observations
  where created_at < now() - interval '90 days';
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

revoke all on function public.purge_learning_observations_older_than_90_days() from public;
grant execute on function public.purge_learning_observations_older_than_90_days() to service_role;

comment on function public.global_learning_public_stats() is
  'Anonymous aggregate counts for Global Learning UI. No user identifiers.';
comment on function public.purge_learning_observations_older_than_90_days() is
  'Retention target: delete raw learning_observations older than 90 days.';
