# Global Learning (shared calibration)

## Same quality for everyone

```text
All users on the same Fly version and GlobalCalibrationPreset
start with the same calibration behavior.
```

한국어:

```text
같은 Fly 버전과 Global Calibration 버전을 사용하는 사용자는
동일한 calibration 품질로 시작합니다.
```

Product default is **GlobalCalibrationPreset** — not per-user PersonalCalibration.

## What “learning” means here

Learning adjusts **experimental calibration parameters** only:

- buy / sell drive thresholds
- confidence threshold
- proposal cooldown
- sensory feature scales

It does **not** retrain or modify MaleCNS connectivity (body IDs, topology,
raw weights).

## Runtime

```text
Market → SensoryEncoder → MaleCNS v1.0 → BehaviorDecoder
  → GlobalCalibrationPreset → Fly → ProposalGuard → RiskEngine → Paper
```

Bundled fallback: `packages/core/calibration/global-v1.0.0.json`

Remote published presets are optional. Network failure → keep bundled.

## Opt-in contribution (default OFF)

Users may contribute **anonymous Paper-only** observations:

```text
Paper closed cycle
  → privacy filter (no symbol / credentials / PII)
  → IndexedDB contribution queue
  → batch upload (10–50) when opt-in + env configured
```

Forbidden uploads: passwords, OTP, cookies, session/auth tokens, Authorization
headers, broker API keys/secrets, email, account numbers, real balances /
holdings, live-order history, personally identifying information, raw symbols.

Live Assist / real-money trades are **never** included.

## Supabase (optional)

Project: [`sfimnzdjndmipmtlnniq`](https://supabase.com/dashboard/project/sfimnzdjndmipmtlnniq)
(`https://sfimnzdjndmipmtlnniq.supabase.co`)

Used only for:

1. anonymous learning observation ingestion via Edge Function
   `ingest-learning-observation`
2. published global preset metadata (`global_calibration_presets`)

Trade History source of truth remains **IndexedDB**.

Ingestion path:

```text
Extension (opt-in)
  → IndexedDB queue
  → POST /functions/v1/ingest-learning-observation
  → validate (schema / enums / ranges / forbidden keys)
  → learning_observations (service role insert)
```

Direct Data API INSERT into `learning_observations` is not granted to anon.
Published presets are SELECT-only for clients. Preset INSERT/UPDATE requires
service role / trusted CI — never auto-deploy from raw observations.

Extension may embed publishable/anon keys only. **Never**
`SUPABASE_SERVICE_ROLE_KEY` in the client bundle.

Forks without Supabase env keep full Fly + Paper + history on the bundled
preset.

Env (build-time, extension) — see `apps/extension/.env.example`:

- `FLY_GLOBAL_LEARNING_ENABLED=1`
- `FLY_SUPABASE_URL=https://sfimnzdjndmipmtlnniq.supabase.co`
- `FLY_SUPABASE_PUBLISHABLE_KEY`

## Retention

Raw `learning_observations`: target **90 days**.

SQL helper (service_role / ops):

```sql
select public.purge_learning_observations_older_than_90_days();
```

Schedule with pg_cron or external ops if volume grows. Document honestly: once
anonymously aggregated into a published preset, per-user delete of server rows
may be impossible; local contribution queue can always be cleared.

## Publishing gate

```text
candidate → offline validation → control comparison → human approval → published
```

Never auto-deploy a new production preset just because more samples arrived.

Release example gates:

- minimum sample count
- max drawdown regression limit vs current
- enough validation trades
- validation return not worse than baseline beyond tolerance

Status values: `candidate` | `ready_for_review` | `published` | `rolled_back`

## Optimization (v1)

No deep ML / GPU. Threshold grid search + robust clipping + time-based
train / validation / holdout split.

Score formula:

```text
score = riskAdjustedReturn - drawdownPenalty - sparsePenalty + pfBonus * winRate

riskAdjustedReturn = totalReturnPct / max(1, sqrt(max(maxDrawdownPct, 1)))
drawdownPenalty    = max(0, maxDrawdownPct - 15) * 0.35
sparsePenalty      = tradeCount < 20 ? 5 : 0
pfBonus            = clamp(profitFactor - 1, 0, 2)   # null profitFactor → 1
```

## Integrity

Remote presets require schema validation + **SHA-256** checksum. Mismatch →
reject and keep previous/bundled.

## Reproducibility

See `tools/calibration/` for download / build / validate / compare scripts.
Prefer publishing binned aggregate snapshots (not raw events) for open
reproducibility when sharing datasets.

## Cost / scale

No runtime LLM or GPU. Small numeric rows + batch ingest. Compatible with
Supabase free tier at low traffic; if volume grows, export offline and prune
raw rows — do not add premature infra.
