# Risk Policy

`RiskEngine` is independent of MaleCNS. Neural output cannot bypass it.

## Definitions

- `maxTradingCapital`: maximum **Fly-controlled open long exposure**
  (mark-to-market of current paper/live-confirmed long positions). It is **not**
  cumulative historical BUY notional.
- `maxSingleOrderValue`: cap on one proposal's estimated value.
- `maxPositionValue`: cap on a single-symbol add.
- `maxDailyNewExposure`: cap on newly opened long exposure for the UTC day.
- SELL orders do not increase exposure.

## Live-assist

LIVE-ASSIST proposals always require `USER_CONFIRM_REQUIRED`. The extension
never calls `click()`, `form.submit()`, or synthetic events to finalize a
broker order.
