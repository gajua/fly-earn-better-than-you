# Risk Policy

`RiskEngine` is independent of MaleCNS. Neural output cannot bypass it.

## Definitions

- `maxTradingCapital`: maximum **Fly-controlled open long exposure**
  (mark-to-market) **plus** proposed buy. Not cumulative historical BUY notional.
- `maxSingleOrderValue`: cap on one proposal's estimated value.
- `maxPositionValue`: **existing instrument exposure + proposed buy**.
- `maxDailyNewExposure`: cap on newly opened long exposure for the UTC day.
- SELL never increases exposure, but must pass owned-quantity checks
  (`sell-without-position`, `sell-exceeds-position`). Shorting is not supported.
- Optional `feeRate`, `slippageBps`, `proposalCooldownMs`.

## Live-assist

LIVE-ASSIST proposals always require `USER_CONFIRM_REQUIRED`. The extension
never calls `click()`, `form.submit()`, or synthetic events to finalize a
broker order.
