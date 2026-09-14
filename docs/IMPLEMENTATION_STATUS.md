# Implementation Status

Status reflects executable evidence, not intent.

## DONE

- Extension-first Shadow DOM Fly (local demo + Binance packed-extension PASS).
- BrokerRegistry + UI/MarketData split; TradeCanvas-adapted public REST wrappers.
- CandleValidator, MarketFeatureExtractor, TemporalAggregator.
- ProposalGuard, RiskEngine, PositionCycle, Paper fills, IndexedDB.
- MaleCNS v1.0 pipeline; real-connectome hard-fail (no Mock fallback).
- Background `brain-fetch` proxy for localhost MaleCNS from broker origins.
- Evaluate schema accepts optional `instrumentId` (extra ignore on env models).
- Forbidden live-action static guard test.
- Broker adapter template + `docs/ADDING_BROKER.md`.
- Cursor rules + hooks; GitHub CI workflow; `scripts/typecheck.mjs`.
- Controlled paper + risk unit tests.
- Sanitized Binance/Upbit fixtures; Max Buy/Max Sell locators.
- **Binance Spot packed-extension Paper path: USABLE BETA** (see REAL_BROWSER_QA).
- **Upbit packed-extension Paper + UX path: USABLE BETA** (iframe chart, market list scan, Paper notional sizing).
- **v1.1:** ko/en i18n, Paper performance analytics, GenericBrokerDetector foundation.
- **Global Learning:** GlobalCalibrationPreset (bundled + optional remote), opt-in anonymous Paper contribution queue, offline calibration builder, optional Supabase migrations (no service_role in extension).

## PARTIAL

- Live Assist: approach/proposal only.
- Binance/Upbit login / portfolio: **NOT VERIFIED**.
- Generic detector: foundation only (not production usable claim).
- Shared learning aggregation / published preset pipeline (migrations + tools; production publish is manual).

## NOT IMPLEMENTED

- Automatic live order submit.
- Mandatory Supabase runtime dependency (optional only).
- Per-user default PersonalCalibration (demoted / experimental).
- Bybit/Kraken/Coinbase UI adapters (Market Data Only).
- Stock broker adapters (Planned).

## Broker matrix

| Broker       | UI              | Market Data      | Paper           | Live Assist     | Full Support                 |
| ------------ | --------------- | ---------------- | --------------- | --------------- | ---------------------------- |
| Demo         | DONE            | DONE             | DONE            | PARTIAL         | YES (local)                  |
| Binance Spot | DONE (public)   | DONE             | DONE (paper)    | PARTIAL         | **USABLE BETA** (not Stable) |
| Upbit        | DONE (public)   | DONE             | DONE (paper)    | PARTIAL         | **USABLE BETA** (not Stable) |
| Bybit        | NOT IMPLEMENTED | MARKET DATA ONLY | NOT IMPLEMENTED | NOT IMPLEMENTED | NO                           |
| Kraken       | NOT IMPLEMENTED | MARKET DATA ONLY | NOT IMPLEMENTED | NOT IMPLEMENTED | NO                           |
| Coinbase     | NOT IMPLEMENTED | MARKET DATA ONLY | NOT IMPLEMENTED | NOT IMPLEMENTED | NO                           |
