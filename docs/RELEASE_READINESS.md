# Release readiness (v1.1.0 public)

Checklist — mark only after actual runs:

- [x] Extension builds (production bundle)
- [x] MaleCNS install instructions in README
- [x] Binance Spot USABLE BETA (packed-extension Paper path; see REAL_BROWSER_QA)
- [x] Upbit USABLE BETA (packed-extension Paper + UX; see REAL_BROWSER_QA)
- [x] No secrets / service_role in extension bundle
- [x] No fake/synthetic market data path
- [x] No live-order automation (static guard + policy)
- [x] License (MIT) + third-party attribution
- [x] README / README.ko polished
- [x] CI workflow present
- [x] Unit tests passing locally
- [x] Global Learning: shared preset + first-run consent + Edge ingest
- [x] Local-only consent ⇒ no contribution upload
- [x] Community stats via privacy-safe aggregate RPC (no fingerprinting)
- [x] 90-day retention helper SQL (`purge_learning_observations_older_than_90_days`)
- [ ] Playwright extension E2E with `RUN_EXTENSION_E2E=1` on this machine
- [ ] `pnpm test:rust` (run when cargo available)

## Version map

```text
Extension release: v1.1.0
GlobalCalibrationPreset: v1.0.0 (bundled + published baseline)
MaleCNS dataset: v1.0
```

Supabase is optional for forks: shared-learning contribution only.
IndexedDB remains Paper/history source of truth.
