-- Global community learning (optional). Product history remains IndexedDB.
-- Extension may use publishable/anon key only — never service_role in clients.

create extension if not exists pgcrypto;

create table if not exists public.learning_observations (
  id uuid primary key default gen_random_uuid(),
  schema_version integer not null check (schema_version = 1),
  preset_version text not null,
  broker_category text not null
    check (broker_category in ('crypto', 'kr-stock', 'us-stock', 'other')),
  momentum double precision not null,
  volatility double precision not null,
  volume_strength double precision not null,
  market_return double precision not null,
  buy_drive double precision not null check (buy_drive >= 0 and buy_drive <= 1),
  sell_drive double precision not null check (sell_drive >= 0 and sell_drive <= 1),
  curiosity double precision not null check (curiosity >= 0 and curiosity <= 1),
  danger double precision not null check (danger >= 0 and danger <= 1),
  activity double precision not null check (activity >= 0 and activity <= 1),
  action text not null check (action in ('paper_buy', 'paper_sell')),
  outcome_return_pct double precision not null
    check (outcome_return_pct >= -500 and outcome_return_pct <= 500),
  holding_duration_bucket text not null,
  created_at timestamptz not null default now(),
  install_id uuid null,
  ingested_at timestamptz not null default now()
);

create index if not exists learning_observations_created_at_idx
  on public.learning_observations (created_at desc);

create index if not exists learning_observations_preset_idx
  on public.learning_observations (preset_version);

create table if not exists public.global_calibration_presets (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  schema_version integer not null check (schema_version = 1),
  sample_count bigint not null default 0,
  buy_threshold double precision not null,
  sell_threshold double precision not null,
  confidence_threshold double precision not null,
  proposal_cooldown_ms integer not null,
  momentum_scale double precision not null default 1,
  volatility_scale double precision not null default 1,
  volume_scale double precision not null default 1,
  return_scale double precision not null default 1,
  checksum_sha256 text not null,
  status text not null
    check (status in ('candidate', 'ready_for_review', 'published', 'rolled_back')),
  brain_mode text not null default 'real-connectome'
    check (brain_mode = 'real-connectome'),
  dataset text not null default 'male-cns:v1.0',
  source text not null default 'aggregated-paper-observations',
  minimum_samples integer not null default 500,
  training_window text null,
  generated_at timestamptz not null,
  published_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists global_calibration_presets_status_idx
  on public.global_calibration_presets (status, published_at desc);

alter table public.learning_observations enable row level security;
alter table public.global_calibration_presets enable row level security;

-- Anonymous insert of Paper learning rows (abuse still possible — validate offline).
create policy learning_observations_anon_insert
  on public.learning_observations
  for insert
  to anon, authenticated
  with check (
    schema_version = 1
    and action in ('paper_buy', 'paper_sell')
    and buy_drive between 0 and 1
    and sell_drive between 0 and 1
    and outcome_return_pct between -500 and 500
  );

-- Clients must not read raw observations (aggregation is offline/admin).
create policy learning_observations_no_select
  on public.learning_observations
  for select
  to anon, authenticated
  using (false);

-- Published presets are readable; writes require service role (bypasses RLS).
create policy global_presets_public_read_published
  on public.global_calibration_presets
  for select
  to anon, authenticated
  using (status = 'published');

comment on table public.learning_observations is
  'Anonymous Paper-only learning observations. Retention target: 90 days. No symbols/PII.';

comment on table public.global_calibration_presets is
  'Versioned GlobalCalibrationPreset. Publish only via service_role / trusted CI.';
