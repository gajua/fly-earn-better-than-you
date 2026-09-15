-- Modular learning pipeline (anonymous summaries). Inserts via trusted Edge Function only.

create table if not exists public.market_observations (
  id uuid primary key default gen_random_uuid(),
  observed_at timestamptz not null,
  broker text not null,
  symbol_category text not null,
  timeframe text not null,
  price_return double precision not null,
  momentum double precision not null,
  volatility double precision not null,
  relative_volume double precision not null,
  trend_conflict double precision not null,
  novelty double precision not null,
  source text not null default 'live',
  created_at timestamptz not null default now()
);

create table if not exists public.module_outputs (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.market_observations(id) on delete cascade,
  module_type text not null check (
    module_type in (
      'market_scanner',
      'chart_observer',
      'volume_observer',
      'risk_observer',
      'decision'
    )
  ),
  score_1 double precision not null,
  score_2 double precision not null,
  score_3 double precision not null,
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  model_version text not null,
  preset_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.future_outcomes (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.market_observations(id) on delete cascade,
  horizon text not null check (horizon in ('5m', '30m', '1h', '4h', '1d')),
  future_return double precision not null,
  future_volatility double precision not null,
  max_adverse_move double precision not null,
  max_favorable_move double precision not null,
  resolved_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (observation_id, horizon)
);

create table if not exists public.trade_cycles (
  id uuid primary key default gen_random_uuid(),
  closed_at timestamptz not null,
  broker_category text not null,
  return_pct double precision not null,
  holding_duration_bucket text not null,
  preset_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.calibration_runs (
  id uuid primary key default gen_random_uuid(),
  dataset_version text not null,
  module_type text not null,
  sample_count integer not null check (sample_count >= 0),
  metrics jsonb not null default '{}'::jsonb,
  candidate_preset jsonb null,
  created_at timestamptz not null default now()
);

alter table public.market_observations enable row level security;
alter table public.module_outputs enable row level security;
alter table public.future_outcomes enable row level security;
alter table public.trade_cycles enable row level security;
alter table public.calibration_runs enable row level security;

create policy market_observations_no_client
  on public.market_observations for all to anon, authenticated
  using (false) with check (false);

create policy module_outputs_no_client
  on public.module_outputs for all to anon, authenticated
  using (false) with check (false);

create policy future_outcomes_no_client
  on public.future_outcomes for all to anon, authenticated
  using (false) with check (false);

create policy trade_cycles_no_client
  on public.trade_cycles for all to anon, authenticated
  using (false) with check (false);

create policy calibration_runs_no_client
  on public.calibration_runs for all to anon, authenticated
  using (false) with check (false);
