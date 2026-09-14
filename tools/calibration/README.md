# Calibration tooling

Offline, reproducible GlobalCalibrationPreset builder.

## Principles

- Does **not** retrain MaleCNS connectivity
- Uses Paper anonymous observations only (`brainMode = real-connectome`)
- Never auto-publishes to production
- Candidate → offline validation → human approval → published

## Scripts

| Script                     | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `download-observations.ts` | Admin export (service role / CI secret)        |
| `build-global-preset.ts`   | Threshold grid search → candidate preset       |
| `validate-preset.ts`       | Schema + SHA-256 checksum                      |
| `compare-control.ts`       | Candidate vs current vs Mock/Shuffled controls |

## Score

```text
score = riskAdjustedReturn - drawdownPenalty - sparsePenalty + pfBonus * winRate

riskAdjustedReturn = totalReturnPct / max(1, sqrt(maxDrawdownPct))
drawdownPenalty    = max(0, maxDrawdownPct - 15) * 0.35
```

See [`docs/GLOBAL_LEARNING.md`](../../docs/GLOBAL_LEARNING.md).

## Example

```bash
node --experimental-strip-types tools/calibration/validate-preset.ts \
  packages/core/calibration/global-v1.0.0.json
```
