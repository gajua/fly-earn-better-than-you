# Broker adapter template

Copy this folder to `packages/broker-adapters/src/brokers/<broker-id>/`.

Replace every `TODO_*` placeholder. Do **not** invent selectors without a live
site check. Keep UI adapter and market-data modules independent.

## Write order

1. Confirm domains / public trading URL
2. Survey public trading page (logged-out if possible)
3. List page types (`trade`, `markets`, `login`, …)
4. URL → symbol parser
5. Login state detection (PARTIAL OK if unverified)
6. BUY target locators
7. SELL target locators
8. Chart landmark (no candle OCR)
9. Market data source (DOM → embedded → public no-auth → unavailable)
10. Sanitized fixtures (no PII / balances / emails)
11. Unit tests
12. Real browser QA → update IMPLEMENTATION_STATUS

Market-data-only PRs must say **MARKET DATA ONLY**.
