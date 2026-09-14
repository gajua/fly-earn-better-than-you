-- Defense in depth: revoke unnecessary Data API GRANTs; keep published preset SELECT.
revoke all on table public.learning_observations from anon, authenticated;
revoke all on table public.global_calibration_presets from anon, authenticated;

grant select on table public.global_calibration_presets to anon, authenticated;

grant select, insert, update, delete on table public.learning_observations to service_role;
grant select, insert, update, delete on table public.global_calibration_presets to service_role;
