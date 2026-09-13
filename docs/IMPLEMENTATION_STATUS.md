# Implementation Status

Status reflects executable evidence, not intent.

## DONE

- Extension-first Shadow DOM Fly (local demo Playwright PASS).
- BrokerRegistry + UI/MarketData split; TradeCanvas-adapted public REST wrappers.
- CandleValidator, MarketFeatureExtractor, TemporalAggregator (no synthetic TF).
- ProposalGuard, RiskEngine, PositionCycle, Paper fills, IndexedDB.
- MaleCNS v1.0 pipeline; real-connectome hard-fail (no Mock fallback).
- Forbidden live-action static guard test.
- Broker adapter template + `docs/ADDING_BROKER.md`.
- Cursor rules (`.cursor/rules/*.mdc`) + hooks (`.cursor/hooks.json`).
- GitHub CI workflow (`.github/workflows/ci.yml`).
- Controlled paper PnL unit test (10@100 → 10@110).
- Sanitized Binance/Upbit DOM fixtures + unit adapter tests.
- Public Binance/Upbit landmark verification (browser QA + Playwright where green).
- Binance Spot order-form locators updated for dual-panel `Max Buy` / `Max Sell` (2026-09-13).

## PARTIAL

- Binance Spot: public page detect/symbol/chart/BUY/SELL/market data verified;
  packed-extension Fly + Paper + History on live Binance **NOT VERIFIED**.
- Upbit: public landmarks + official candles verified; Fly/Paper on live page
  **NOT VERIFIED**.
- Live Assist: approach/proposal only; no live fill reconciliation UI.
- Extension persistent-context harness: code present; agent env run incomplete.
- Candidate scan queue: implemented with limits; not productized in popup UI.

## NOT IMPLEMENTED

- Automatic live order submit / click / form submit.
- Supabase product dependency (future optional sync only).
- Bybit/Kraken/Coinbase UI adapters (Market Data Only).
- Stock broker adapters (Planned).
- Canvas candle OCR / synthetic candles.

## Broker matrix

| Broker       | UI              | Market Data      | Paper           | Live Assist     | Full Support |
| ------------ | --------------- | ---------------- | --------------- | --------------- | ------------ |
| Demo         | DONE            | DONE             | DONE            | PARTIAL         | YES (local)  |
| Binance Spot | PARTIAL         | DONE             | PARTIAL         | PARTIAL         | NO           |
| Upbit        | PARTIAL         | DONE             | PARTIAL         | PARTIAL         | NO           |
| Bybit        | NOT IMPLEMENTED | MARKET DATA ONLY | NOT IMPLEMENTED | NOT IMPLEMENTED | NO           |
| Kraken       | NOT IMPLEMENTED | MARKET DATA ONLY | NOT IMPLEMENTED | NOT IMPLEMENTED | NO           |
| Coinbase     | NOT IMPLEMENTED | MARKET DATA ONLY | NOT IMPLEMENTED | NOT IMPLEMENTED | NO           |

## Tracking

- GitHub: this file + `docs/REAL_BROWSER_QA.md` are source of truth.
- Notion: private “Fly Broker Support” DB mirrors the matrix for tracking only.
