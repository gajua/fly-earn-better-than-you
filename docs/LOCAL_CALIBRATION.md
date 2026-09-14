# Local Calibration

## Replay CLI

```bash
pnpm calibration:replay -- --symbol BTCUSDT --timeframe 1h --from 2026-01-01T00:00:00.000Z --to 2026-02-01T00:00:00.000Z
```

Uses only candles `<= t` for features; labels use `t+1` return (no feature leakage).

## Module report

```bash
pnpm calibration:module-report
```

Emits a candidate preset skeleton for offline review — **not** auto-published.

## Preset shape (runtime)

```json
{
  "chart": { "momentum": 0.42, "trendConflict": 0.31, "maSlope": 0.18 },
  "volume": { "relativeVolume": 0.55, "spike": 0.45 }
}
```

Tuning methods: grid search, random search, weighted scores, simple linear/logistic calibration (`tools/calibration/`).
