# Real Browser QA

This document records **observed evidence**, not intended behavior.

Last updated: 2026-09-13
Branch: `feat/reuse-open-source-broker-adapters`

## Summary

| Broker | Public page detect | Symbol | BUY/SELL target | Real market data | Extension overlay | Paper round-trip | Logged-in portfolio |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Binance Spot | PASS | PASS | PASS on public DOM | PASS | NOT YET VERIFIED IN UNPACKED EXTENSION SESSION | NOT YET VERIFIED END-TO-END | NOT VERIFIED |
| Upbit | PASS | PASS | PASS on public DOM | PASS | NOT YET VERIFIED IN UNPACKED EXTENSION SESSION | NOT YET VERIFIED END-TO-END | NOT VERIFIED |

`PASS` here means the relevant public-page DOM or public market-data probe was verified in the implementation work. It does **not** mean the full extension flow was exercised in a real Chrome profile.

---

## Binance Spot

Public page used during adapter verification:

```text
https://www.binance.com/en/trade/BTC_USDT?type=spot
```

### Verified

- Broker page recognized as Binance Spot trade page.
- URL symbol normalization: `BTC_USDT` → `BTCUSDT`.
- Chart landmark was found on the public page.
- BUY/SELL tabs were found on the public page DOM.
- Public Binance kline endpoint responded without a user API key.
- Market-data wrapper does not silently substitute an unsupported timeframe.
- No user API key, API secret, cookie, or broker auth token is required for public market observations.

### Not yet fully verified

- Loading `apps/extension/dist` into a real Chrome profile and confirming `#fly-earn-better-root` on Binance.
- Real-connectome MaleCNS path from Binance observation → neural response → Fly movement in a production-host browser session.
- Controlled Paper BUY → Paper SELL → PositionCycle close → History display on Binance.
- Persistence after Chrome extension service-worker restart.
- Logged-in portfolio / trade-history reconciliation.

### Current status

**Beta**, not Stable/Full Support.

---

## Upbit

Public page used during adapter verification:

```text
https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC
```

### Verified

- Upbit exchange page recognized.
- Symbol/query structure recognized.
- Buy/Sell tabs found in the public DOM.
- Highcharts container found as chart landmark.
- Official public candle endpoint responded without a user API key.

### Not yet fully verified

- Full unpacked-extension session on Upbit.
- Fly overlay movement on production Upbit DOM.
- Paper BUY/SELL round trip on the production page.
- Logged-in portfolio state.
- Live-assist reconciliation.

### Current status

**Partial**.

---

## What counts as Full browser E2E

A broker must pass the following in a real Chrome/Chromium profile with the unpacked extension loaded:

1. Supported tab detected.
2. Page context detected with sufficient confidence.
3. Current instrument detected.
4. Real, non-synthetic market data acquired.
5. Multiple supported timeframes validated.
6. MaleCNS `real-connectome` mode receives the observation without Mock fallback.
7. `#fly-earn-better-root` exists on the broker page.
8. Fly overlay remains non-interactive (`pointer-events: none`).
9. Controlled Paper BUY opens a `PositionCycle`.
10. Controlled Paper SELL closes that cycle.
11. Buy average, sell average, realized P&L and return are correct.
12. IndexedDB history survives page reload / service-worker restart.
13. Invalid SELL and max-capital violations are rejected.
14. No live broker order is submitted.

Until these checks pass, README support should remain **Beta** or **Partial**.

---

## Safety boundary

Real browser QA must never:

- submit a real BUY order,
- submit a real SELL order,
- fill broker credentials automatically,
- read/store passwords, OTPs, cookies, session tokens, or trading secrets,
- use live auto-click to confirm an order.

Production-site QA is Paper-only unless a user manually performs a Live Assist order outside automated test flow.
