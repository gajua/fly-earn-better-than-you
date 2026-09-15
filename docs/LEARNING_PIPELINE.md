# Learning Pipeline

## Local-first

```text
live observation → IndexedDB (market-observations, module-outputs, pending-outcomes)
                 → future outcome resolver
                 → future-outcomes
```

Works with `local_only` (no Supabase). `contribute` uploads **filtered summaries** only.

## Upload filters (experimental config)

High novelty, trend conflict, volume anomaly, revisit, decision events, resolved outcomes, plus random sample (`DEFAULT_LEARNING_PIPELINE_CONFIG` in `@fly/core`).

Guards: batch size, daily cap (planned in contribution flush), dedupe window, retry backoff, local retention days.

## Supabase tables

See migration `20260914120000_modular_learning.sql`:

- `market_observations`
- `module_outputs`
- `future_outcomes`
- `trade_cycles`
- `calibration_runs`

Client direct INSERT is denied; trusted ingest only.

## Paper vs module learning

Chart / Volume / Risk / Scanner learn from **observations + future outcomes** without trades.

Decision module still uses **Paper closed cycles** as primary PnL ground truth.
