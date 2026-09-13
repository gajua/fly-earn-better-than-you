# Add a Broker in ~8 Steps

GitHub `docs/IMPLEMENTATION_STATUS.md` is the source of truth for support
claims. Notion (if used) is tracking only.

## Market Data Only vs Full Broker

| Contribution | Label |
| --- | --- |
| Public no-auth candles only | **MARKET DATA ONLY** |
| UI adapter + market data + fixtures + real browser QA | Usable / Full (after QA) |

Never mark Full Support from unit tests alone.

## Steps

1. **Copy template**  
   `packages/broker-adapters/template/` → `packages/broker-adapters/src/brokers/<id>/`

2. **Fill `manifest.ts`**  
   domains, optional host permissions, honest status (`PARTIAL` until browser QA).

3. **Implement `page-classifier.ts`**  
   Map URL + landmarks → page kinds (`trade`, `login`, …). Fail closed to
   `unknown` when unsure.

4. **Implement `locators.ts` + `ui-adapter.ts`**  
   Selector priority: data attribute → ARIA → role → label → visible text →
   structural. Evidence required (fixture + browser QA notes).

5. **Implement `market-data.ts`**  
   Prefer official public no-auth endpoints or existing OSS wrappers. No API
   keys. Unsupported timeframes → `UNAVAILABLE`.

6. **Add sanitized fixtures**  
   No usernames, balances, emails, account IDs. Cover trade + missing-target.

7. **Register** in `packages/broker-adapters/src/registry.ts` and extension
   `manifest.json` matches / host permissions.

8. **Tests + QA record**  
   Unit + fixture tests, `pnpm --filter @fly/extension build`, then real
   browser QA → update `docs/IMPLEMENTATION_STATUS.md` and
   `docs/REAL_BROWSER_QA.md`.

## Required PR checklist

- [ ] manifest
- [ ] UI adapter
- [ ] page classifier
- [ ] locator evidence
- [ ] market provider (or explicit MARKET DATA ONLY)
- [ ] fixtures
- [ ] unit tests
- [ ] QA record (honest PASS / PARTIAL / FAIL)

See also: `packages/broker-adapters/template/README.md`, `AGENTS.md`.
