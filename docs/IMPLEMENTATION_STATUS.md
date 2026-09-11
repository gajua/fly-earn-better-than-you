# Implementation Status

Status reflects executable evidence, not intent.

## DONE

- Extension-first vertical slice on local demo broker (`127.0.0.1`).
- `BrokerRegistry` + expanded `BrokerAdapter` with login/watchlist/targets/
  timeframes; demo fixture tests.
- Session lifecycle mapping: `NO_BROKER` → sleeping badge/popup copy.
- Content-script Shadow DOM Fly (`#fly-earn-better-root`) with
  `pointer-events: none`.
- Multi-timeframe observation aggregation into `MarketEnvironment` without
  direct timeframe→BUY rules.
- RiskEngine with exposure-based `maxTradingCapital` (not cumulative buys).
- Paper trading auto-fill path + IndexedDB trade ledger helpers.
- Popup: status, settings, paper performance, privacy clear.
- Existing MaleCNS Python pipeline preserved; Mock remains explicit.
- Core unit tests for risk/paper/session/temporal; adapter fixture tests;
  extension order-safety tests.

## PARTIAL

- Production broker adapters (Binance/Toss/etc.): registry shape only.
- Live-assist confirmation UX: proposal gating exists; full “Review order”
  broker-UI handoff UI is minimal.
- Candidate ranking across many symbols: watchlist is read; deep multi-asset
  scan loop is basic (current asset focused).
- Performance dashboard: popup summary only (not a full page).
- Optional host permission request flow: implemented for demo origins;
  end-user enablement UX is basic.
- Tauri companion: retained, not redesigned; optional sleeping desktop Fly
  remains previous desktop behavior.
- OS-level proof of extension overlay non-interference beyond CSS
  `pointer-events: none` + Shadow isolation.

## NOT IMPLEMENTED

- Unattended autonomous live trading.
- Automatic `click()` / `submit` of real broker orders.
- `<all_urls>` broad host access.
- Password/OTP/cookie/session-token reading.
- WASM/Rust in-browser MaleCNS rewrite.
- Windows/macOS installer changes for this iteration.
- Native Messaging host.

## Evidence notes

- First actual supported broker in this slice: **local demo**, not a production
  exchange.
- Candidate ranking / paper fills are experimental product layers, not
  profitability claims.
