# Extension Architecture

Primary browser UX is the Chrome Manifest V3 extension.

```text
Broker tab
  -> content script BrokerAdapter (viewport DOM only)
  -> multi-timeframe observations
  -> TemporalAggregator -> MarketEnvironment
  -> FlyBrain (Mock | real-connectome | shuffled-control)
  -> Shadow DOM Fly overlay (pointer-events: none)
  -> optional Paper Trading / RiskEngine / Trade Ledger
  -> popup status / settings / performance
```

## Roles

- **Extension content script**: detect broker page, login state, targets, render
  Fly in `#fly-earn-better-root` open Shadow DOM, evaluate brain.
- **Extension service worker**: tab presence, badge/sleep UX, preferences,
  paper fills, IndexedDB ledger access, optional desktop bridge forward.
- **Tauri desktop**: optional MaleCNS companion, sleeping desktop Fly,
  developer diagnostics, future Native Messaging host. Not the primary market
  overlay.
- **Python brain service**: current verified MaleCNS sparse pipeline. Future
  extension-only mode may move this to WASM/Rust; that rewrite is out of scope
  for this iteration.

## Permissions

- Required: `storage`, `tabs`.
- Host access: per-broker `optional_host_permissions` (demo loopback for now).
- Never `<all_urls>` by default.
- Never read passwords, OTP, cookies, session tokens, or auth headers.

## Coordinate model

Extension Fly uses viewport `getBoundingClientRect()` targets directly.
It does not convert to desktop `ScreenRect`.
