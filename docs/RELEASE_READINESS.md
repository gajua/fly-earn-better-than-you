# Release readiness (open-source usable v1)

Checklist — mark only after actual runs:

- [x] Extension builds (`E2E_TEST_MODE=0` production bundle without `__flyE2EForce`)
- [x] MaleCNS install instructions in README
- [ ] Binance usable paper path end-to-end with packed extension on live page
- [x] Upbit status honest (PARTIAL)
- [x] No secrets / service_role in extension
- [x] No fake/synthetic market data path
- [x] No live-order automation (static guard + policy)
- [x] License + third-party attribution
- [x] README polished
- [x] CI workflow present
- [x] Unit tests passing locally
- [x] Playwright demo + Upbit public PASS; Binance public flaky/headless TBD
- [ ] `pnpm test:rust` (run when cargo available)
- [x] Contributor broker template + ADDING_BROKER.md
- [x] Cursor rules/hooks

Supabase: not a v1 product dependency (IndexedDB local-first).
