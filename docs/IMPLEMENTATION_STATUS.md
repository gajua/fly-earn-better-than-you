# Implementation Status

Status reflects executable evidence, not intent.

## DONE

- Extension-first Shadow DOM Fly on local demo broker.
- BrokerRegistry + expanded BrokerAdapter (page context, locator resolve,
  modal detect, market-data provider hook).
- TradeCanvas-adapted **MarketDataProvider** wrappers (CODE_REUSE, MIT) for
  Binance / Bybit / Coinbase / Kraken public REST klines — no npm chart bundle.
- CandleValidator + broker-neutral MarketFeatureExtractor.
- Provider chain that skips duplicate `endpointFamily` after
  `DATA_PROVIDER_ERROR` (no mock candle fallback).
- Binance Spot UI adapter (public page detect, URL symbol, Buy/Sell tabs,
  chart shell) verified in browser QA 2026-09.
- Upbit UI adapter (exchange URL `code=`, 매수/매도 tabs, Highcharts container)
  + official public candle API provider.
- Extension content multi-broker resolve; background `proxy-fetch` allowlist for
  public market APIs; guest trade observation without login for paper.
- TimeframeObservation `dataProvider` provenance (`tradecanvas` /
  `official-public` / …).
- Removal of synthetic multi-timeframe scaling from content evaluation.
- ProposalGuard, RiskEngine, PositionCycle, Paper fills, IndexedDB ledger
  (reused; not rewritten for this iteration).
- MaleCNS pipeline preserved; real-connectome still no Mock fallback.

## Browser QA (2026-09-12)

### Binance Spot (`https://www.binance.com/en/trade/BTC_USDT?type=spot`)

| Check | Result |
| --- | --- |
| Page detect /trade + symbol | PASS (`BTC_USDT` → `BTCUSDT`) |
| Chart landmark `.chart-widget-shell` | PASS |
| Buy/Sell `[role=tab].bn-tab__buySell` | PASS |
| Public market REST (`api.binance.com` klines) | PASS (network probe) |
| Login state | PARTIAL (`#toLoginPage` ⇒ LOGGED_OUT; guest paper allowed) |
| Portfolio / live history | NOT VERIFIED (no account) |
| Extension Fly overlay on live page | NOT run in packed Chrome this session (DOM+API verified; load unpacked for full E2E) |

### Upbit (`https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC`)

| Check | Result |
| --- | --- |
| Page detect + `CRIX.UPBIT.KRW-BTC` | PASS |
| 매수/매도 `a.tabB__button` | PASS |
| Chart `.highcharts-container` | PASS |
| Official public candles | PASS (network probe) |
| Portfolio / logged-in | NOT VERIFIED |

## PARTIAL

- Binance/Upbit full support (portfolio, live reconciliation, logged-in).
- Bybit/Kraken/Coinbase: **Market Data READY**, UI **NOT IMPLEMENTED**.
- TradingView shared reader: detect helpers only; never invents OHLCV.
- Candidate scan queue exists with concurrency cap; not fully productized in UI.
- iframe / webNavigation / closed-shadow: unchanged from prior hardening notes.
- Extension live overlay QA on production hosts: DOM verified; full packed-extension
  session on Binance still recommended before claiming Full Support.

## NOT IMPLEMENTED

- Automatic live order submit / click / form submit.
- Supabase / cloud sync (optional).
- Canvas/WebGL candle OCR / synthetic candles.
- Short selling.
- Benchmark return series.
- npm dependency on `@tradecanvas/*` (intentionally avoided; see
  `docs/THIRD_PARTY_ADAPTERS.md`).

## Broker matrix (honest)

| Broker | UI | Real Market Data | Paper | Live Assist | Full Support |
| --- | --- | --- | --- | --- | --- |
| Demo | ✅ | ✅ (explicit demo JSON only) | ✅ | PARTIAL | YES (local) |
| Binance Spot | PARTIAL | ✅ TradeCanvas-adapted public REST | ✅ (guest) | PARTIAL | NO |
| Upbit | PARTIAL | ✅ official-public REST | PARTIAL | PARTIAL | NO |
| Bybit | NOT IMPLEMENTED | ✅ Market Data Ready | — | — | NO |
| Kraken | NOT IMPLEMENTED | ✅ Market Data Ready | — | — | NO |
| Coinbase | NOT IMPLEMENTED | ✅ (no 4h) | — | — | NO |

## Capability notes

- Coinbase `4h` → UNAVAILABLE (Exchange granularity set has no 4h; no silent 1h).
- Upstream TradeCanvas silent TF defaults are blocked in wrappers.
- API keys / secrets / OAuth trading tokens: never requested.
- Runtime LLM / remote OCR: none.
