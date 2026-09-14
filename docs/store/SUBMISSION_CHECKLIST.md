# Chrome Web Store submission checklist

## Package

- [x] Extension version `1.1.0` (manifest + package.json)
- [x] Global Calibration remains `v1.0.0` (independent)
- [x] Production build without `E2E_TEST_MODE=1`
- [x] Release ZIP with `manifest.json` at ZIP root
- [x] Secret scan on ZIP contents (no service_role / private secrets)
- [x] Icons 16/32/48/128 present in package

## Listing

- [x] Store copy drafted (`docs/store/CHROME_WEB_STORE.md`)
- [x] Short description ≤ 132 chars
- [x] Detailed description avoids guaranteed-return / advisor claims
- [x] Permission justifications (`docs/store/PERMISSION_JUSTIFICATIONS.md`)
- [x] Privacy disclosure draft (`docs/store/PRIVACY_DISCLOSURE.md`)
- [x] Privacy policy (`PRIVACY.md` + `docs/privacy/index.html`)
- [x] Release notes (`docs/store/RELEASE_NOTES_v1.1.0.md`)

## Assets

- [x] Store icon 128×128
- [x] Small promo 440×280
- [x] Binance / Upbit screenshot candidates (1280×800)
- [ ] Capture popup screenshots: performance, Global Learning onboarding, language
      (logged-out / no account PII)

## Validation

- [x] lint / typecheck / unit tests / extension build / python tests (local)
- [x] Production ZIP secret + E2E-hook scan
- [x] Headed extension E2E smoke (popup settings / load; Chromium launch can be flaky)
- [ ] Fresh install QA on production ZIP (manual clean Chrome profile)
- [ ] `main` CI green after merge
- [ ] GitHub Release `v1.1.0` after main green (`docs/store/GITHUB_RELEASE.md`)
- [ ] Commit + merge store packaging branch (`feat/global-community-learning` has local uncommitted packaging docs)

## Fresh install QA (production ZIP / unpacked dist)

- [ ] Load unpacked from packaged contents (or `apps/extension/dist` after `pnpm package:extension`)
- [ ] Onboarding appears; no Global Learning preselection; Continue disabled until choice
- [ ] Choose local-only → no upload attempts
- [ ] Choose contribute → queue/upload path works with publishable key build
- [ ] ko / en language switch
- [ ] Binance Spot: Fly overlay + Paper
- [ ] Upbit: Fly overlay + Paper
- [ ] Performance history local
- [ ] No automatic live-order submit

## Developer / Store (user action)

- [ ] Google account with Chrome Web Store Developer registration paid
- [ ] 2FA enabled
- [ ] Enable GitHub Pages for privacy URL (`/docs` → `/privacy/`) — **required**
- [ ] Upload ZIP + listing + assets in Developer Dashboard
- [ ] Complete privacy questionnaire using `PRIVACY_DISCLOSURE.md`
- [ ] Paste permission justifications when asked
- [ ] Submit for review
