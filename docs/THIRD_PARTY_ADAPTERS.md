# Third-Party Adapter Audit

Reuse decisions for market-data / host-detection references.

| Project | Purpose | License | Reuse type | Version/SHA | Files/API used | Code copied |
| --- | --- | --- | --- | --- | --- | --- |
| [bonguynvan/tradecanvas](https://github.com/bonguynvan/tradecanvas) | Public REST kline adapters (Binance/Coinbase/Bybit/Kraken) | MIT (verified LICENSE) | CODE_REUSE | commit `f7bdb2f3603a9dba72bf767343e692c002f0ea79` (npm `@tradecanvas/core` also published; not depended on) | Adapted REST fetch/parse from `packages/core/src/realtime/adapters/{Binance,Bybit,Coinbase,Kraken}Adapter.ts` + parse helpers | YES (minimal REST logic only) |
| [suave-tech/extension-trade-assistant](https://github.com/suave-tech/extension-trade-assistant) | Host detection / TradingView chart scraping ideas | **License not declared** on GitHub (`license: null`) | REFERENCE_ONLY | observed 2026-09 | Concepts only: host detect, URL symbol, MutationObserver SPA, timeframe label | NO |
| [chenjingdev-archive/upbit-arrowbtn](https://github.com/chenjingdev-archive/upbit-arrowbtn) | Upbit extension URL/market navigation patterns | MIT (GitHub license metadata) | REFERENCE_ONLY | observed 2026-09 | URL/`code=` market pattern ideas only; selectors re-verified on live Upbit | NO |

## TradeCanvas dependency decision

**Not using `@tradecanvas/chart` / `@tradecanvas/core` as an npm dependency in the extension.**

Reasons:

1. `@tradecanvas/core@1.0.0` unpacks ~3.4MB (canvas rendering engine).
2. Package exports are a single `"."` entry — no adapter-only subpath.
3. Pulling adapters via `@tradecanvas/chart` would risk shipping chart UI into MV3.

Instead: MIT-adapted REST provider wrappers behind `MarketDataProvider`, with attribution in `THIRD_PARTY_NOTICES.md`.

Upstream silent timeframe defaults (`?? '15m'`, `?? 3600`, etc.) are **blocked** in our wrappers — unsupported Fly timeframes return `UNSUPPORTED_TIMEFRAME` / UNAVAILABLE.

## Roles

| Layer | Owner |
| --- | --- |
| Broker UI adapter (login, BUY/SELL DOM, page class) | This repo |
| Market data provider (OHLCV / price) | TradeCanvas-adapted / Upbit official public |
| MaleCNS / Risk / Paper / History | Existing Fly core (unchanged lifecycle) |
