# Permission justifications — Fly Earn Better Than You

Use these answers in Chrome Web Store permission / host-permission review forms.
Principle: **minimum required access** for Paper observation on supported brokers.
No `<all_urls>`.

## `storage`

Stores language preference, Global Learning consent, trading/brain preferences,
risk caps, and other extension settings via `chrome.storage`.

Paper trades/cycles/history and contribution queue use IndexedDB on-device.

## `tabs`

Used to detect whether a supported broker tab is active, update the action
badge/status, and coordinate popup ↔ content messaging for Fly session state.
Does not read browsing history outside the active Fly workflow.

## Host permissions — Binance

`https://www.binance.com/*`, `https://binance.com/*`, `https://api.binance.com/*`

- detect Binance Spot trade pages
- locate chart / Max Buy / Max Sell landmarks
- fetch public market candles for Paper observation
- render non-interactive Fly overlay

## Host permissions — Upbit

`https://www.upbit.com/*`, `https://upbit.com/*`, `https://api.upbit.com/*`

- detect Upbit exchange pages
- locate chart / 매수 / 매도 landmarks
- fetch official public candles
- render non-interactive Fly overlay

## Host permissions — MaleCNS localhost

`http://127.0.0.1:8000/*`, `http://localhost:8000/*`

Optional local MaleCNS brain service for `real-connectome` mode. Missing service
hard-fails (no silent Mock fallback). Not used for credential capture.

## Host permissions — Supabase

`https://sfimnzdjndmipmtlnniq.supabase.co/*`

Optional Global Learning only:

- batch upload of anonymous Paper observations (opt-in)
- fetch published Global Calibration preset metadata

Local-only consent ⇒ no learning upload. Bundled preset always works offline.

## Optional host permissions

Local demo origins (`127.0.0.1:5173/5174`) and market-data-only provider hosts
(Bybit / Coinbase / Kraken APIs) for optional/future recognition paths. Not
required to claim Full Broker Support.

## Explicitly not requested

- `<all_urls>`
- `cookies`
- `webRequest` / header interception
- identity / OAuth trading scopes
- downloads / nativeMessaging for live order automation
