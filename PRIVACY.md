# Privacy Policy — Fly Earn Better Than You

**Last updated:** 2026-09-14

This Privacy Policy describes how the **Fly Earn Better Than You** Chrome
extension (“Fly”, “we”, “the extension”) handles information.

Public store listing URL for this policy (GitHub Pages, after enablement):

`https://gajua.github.io/fly-earn-better-than-you/privacy/`

Repository copy: this file (`PRIVACY.md`) and `docs/privacy/index.html`.

## Summary

- Fly is Paper-first and does **not** automatically submit real-money orders.
- Most data stays on your device (IndexedDB / `chrome.storage`).
- Optional **Global Learning** may upload anonymous Paper observations only
  after an explicit first-run / settings choice.
- We do **not** sell data. We do **not** use data for advertising.

## What pages Fly can read

On pages you open that match supported host permissions (currently Binance Spot
and Upbit trading pages, plus optional local demo / MaleCNS localhost), Fly may
read:

- page structure needed to detect the trading UI
- publicly visible symbol / market context on the page
- chart and BUY / SELL landmark locations for the non-interactive Fly overlay
- public market candle / feature data (DOM or public no-auth endpoints)

Fly does **not** require you to log in for the supported public observation path.

## Why broker host permissions are needed

Host permissions exist so Fly can:

1. detect a supported trading page
2. observe public market context and landmarks
3. draw a non-interactive Fly overlay (`pointer-events: none`)
4. run Paper simulation against observed prices

Permissions are limited to supported brokers and required public market APIs.
Fly does **not** use `<all_urls>`.

## Local storage (IndexedDB / chrome.storage)

Fly stores on your device:

- language preference
- Global Learning consent (`contribute` or `local_only`)
- Paper positions, trades, and cycles
- local performance history
- extension preferences (brain mode, risk caps, etc.)
- optional contribution queue (only if you chose to contribute)

Local Paper/history is the product source of truth.

## Optional Global Learning (Supabase)

If you choose **Share anonymous Paper results**:

1. closed Paper cycles may create privacy-filtered observations
2. observations wait in a local IndexedDB queue
3. they upload in batches to Supabase via Edge Function
   `ingest-learning-observation`
4. validated rows enter `learning_observations` for offline calibration research

If you choose **Keep Paper learning data on this device**, Fly makes **no**
Global Learning upload requests.

Remote published calibration presets may be fetched when configured. Network
failure falls back to the bundled Global Calibration preset. Product quality is
the same regardless of contribution choice.

### What Global Learning may include

- brainMode (`real-connectome` only for shared learning)
- presetVersion
- brokerCategory (e.g. crypto)
- marketFeatures (momentum, volatility, volumeStrength, return)
- brain output drives
- Paper action (`paper_buy` / `paper_sell`)
- Paper return and holding-duration bucket

### What we intentionally do not collect / upload

- broker login credentials / passwords / OTP
- cookies, session tokens, Authorization headers
- broker API keys or secrets
- email or personal identity
- account numbers
- real portfolio holdings or balances
- real-money / live-order history
- raw stock/crypto symbols in contribution payloads

## Real-money trades

Live Assist never auto-submits orders. Real-money trading activity is **not**
included in the Global Learning dataset.

## Retention

Raw anonymous learning observations target **90 days** retention
(`purge_learning_observations_older_than_90_days` helper on the backend).
Local data remains until you clear it.

Once observations are anonymously aggregated into a published calibration
preset, individual server-row deletion may not be possible.

## Changing consent

Open the Fly popup → **Global Learning** → choose:

- Share anonymous Paper results, or
- Keep Paper learning data on this device

Then save. You can change this at any time.

## Deleting local data

In the Fly popup Privacy section:

- Clear Paper history
- Clear contribution queue
- Reset all local Fly data

These actions remove on-device data. They do not guarantee deletion of already
uploaded anonymous aggregated server rows.

## Contact

Open an issue in the public repository:

https://github.com/gajua/fly-earn-better-than-you/issues

## Changes

We may update this policy as the project evolves. The “Last updated” date above
will change when material updates are published.
