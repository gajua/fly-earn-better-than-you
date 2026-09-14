# Real Browser QA

Only record results from commands/sessions that actually ran.

Last updated: 2026-09-14  
Branch: `feat/global-community-learning`

## Autonomous Exploration v1 (2026-09-14)

Commands that actually ran this session:

```bash
pnpm test                          # 92 passed
pnpm test:python                   # 8 passed
pnpm --filter @fly/extension build
pnpm test:e2e -- e2e/binance-public.spec.ts --project=chromium
E2E_TEST_MODE=1 pnpm --filter @fly/extension build
SKIP_WEB_SERVER=1 RUN_EXTENSION_E2E=1 \
  pnpm exec playwright test \
  e2e/binance-autonomous-exploration.spec.ts \
  e2e/extension-binance-smoke.spec.ts \
  --project=extension --workers=1
```

| Check                                          | Result                                                   |
| ---------------------------------------------- | -------------------------------------------------------- |
| Unit: interest / novelty / conflict / gating   | PASS                                                     |
| Click guard (no BUY/SELL automation)           | PASS                                                     |
| Python MaleCNS graph + encoder                 | PASS                                                     |
| Binance public landmarks                       | PASS                                                     |
| Fly overlay + Binance smoke                    | PASS                                                     |
| Exploration HUD wake, no broker BUY/SELL click | PASS                                                     |
| Production extension build                     | PASS                                                     |
| Full headed suite in parallel (Paper/Upbit UX) | NOT VERIFIED this session (timeouts / worker contention) |

BTC→ETH URL change and 1d→4h clicks were exercised by the agent; the passing E2E asserts HUD + zero BUY/SELL clicks, not a strict ETH URL.

---

## Summary

| Broker       | Extension | Landmarks | Candles | MaleCNS  | Fly       | Paper | Persistence | Claim           |
| ------------ | --------- | --------- | ------- | -------- | --------- | ----- | ----------- | --------------- |
| Binance Spot | PASS      | PASS      | PASS    | PASS     | PASS      | PASS  | PASS        | **USABLE BETA** |
| Upbit        | PASS      | PASS      | PASS    | PASS     | PASS (UX) | PASS  | PASS        | **USABLE BETA** |
| Demo local   | PASS      | PASS      | PASS    | optional | PASS      | PASS  | PASS        | local           |

## Binance Spot — USABLE BETA evidence

Command (2026-09-14):

```bash
E2E_TEST_MODE=1 node apps/extension/scripts/build.mjs
# MaleCNS: uvicorn on 127.0.0.1:8000
SKIP_WEB_SERVER=1 RUN_EXTENSION_E2E=1 \
  node node_modules/@playwright/test/cli.js test \
  e2e/binance-paper-usable.spec.ts --project=extension
# → 1 passed
```

| Field                                     | Result                                    |
| ----------------------------------------- | ----------------------------------------- |
| Extension loaded (persistent context)     | PASS                                      |
| Content script / `#fly-earn-better-root`  | PASS                                      |
| Shadow root + `pointer-events: none`      | PASS                                      |
| Broker / trade page / symbol              | PASS (`BTCUSDT`)                          |
| BUY / SELL targets                        | PASS (`Max Buy` / `Max Sell`)             |
| Real candles (non-synthetic)              | PASS                                      |
| MaleCNS `/health` + evaluate              | PASS (`male-cns:v1.0`, connectome loaded) |
| real-connectome (no Mock fallback)        | PASS                                      |
| Controlled Paper BUY → open cycle         | PASS                                      |
| Controlled Paper SELL → close cycle       | PASS                                      |
| buy/sell averages, realized PnL, return % | PASS                                      |
| History + reload persistence              | PASS                                      |
| Broker DOM click count unchanged          | PASS                                      |
| Login / portfolio                         | NOT VERIFIED                              |

Not Stable. Login portfolio remains NOT VERIFIED.

## Real-user UX checklist (Upbit / Binance)

Used as a first-person review before claiming “feels usable”.

| #   | Check                              | Pass criteria                                                                          |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | Fly mounts without blocking clicks | `#fly-earn-better-root` + `pointer-events: none`                                       |
| 2   | Free explore                       | Brain can leave `enter` and roam (`explore`) — not stuck on one landmark               |
| 3   | Chart attention                    | Fly approaches the **primary visible chart** (Upbit: large iframe, not tiny sparkline) |
| 4   | Symbol scan                        | With market-list/search landmark, high curiosity → `scan_assets` toward right list     |
| 5   | Buy / sell guidance                | Strong drive → approach BUY/SELL tabs; bubble explains interest                        |
| 6   | Readable bubble                    | Bubble stays horizontal, parked near landmark (not rotated with fly body)              |
| 7   | Paper path                         | Valid price > 0; proposal not rejected as `invalid-numeric-input`                      |
| 8   | Fail closed                        | Brain/data down → sleep + clear message; no fake prices                                |

### 2026-09-14 agent review notes

Code + live Upbit DOM probe + packed-extension E2E:

- **Bug fixed:** `forceState` always mapped `WATCHING → observe_chart`, blocking explore/scan.
- **Bug fixed:** `canTransition` never left `enter`.
- **Bug fixed:** Upbit chart locator preferred tiny `.highcharts-container`; real chart is a large iframe.
- **Bug fixed:** Upbit `search` was always null → scan fell back to chart.
- **Bug fixed:** Paper `quantity: 1` on KRW-BTC (~1e8) exceeded risk caps → sized to ~100k notional.
- **Improved:** Korean bubble copy for explore / chart / scan / buy / sell.
- **Improved:** Title price parses `104,623,000 BTC/KRW` for Paper.

Verified:

```bash
E2E_TEST_MODE=1 node apps/extension/scripts/build.mjs
SKIP_WEB_SERVER=1 RUN_EXTENSION_E2E=1 \
  node node_modules/@playwright/test/cli.js test \
  e2e/upbit-extension.spec.ts e2e/upbit-paper-usable.spec.ts \
  --project=extension --workers=1
# → smoke + UX landmark tour + Paper BUY/SELL: PASS
```

## Upbit — USABLE BETA evidence

Public landmarks + official candles: PASS (`e2e/upbit-public.spec.ts`).  
Packed extension Fly/UX/Paper + persistence: PASS.

## Other gates

| Command                                  | Result                           |
| ---------------------------------------- | -------------------------------- |
| unit vitest                              | PASS                             |
| python brain tests                       | PASS (8)                         |
| `e2e` demo + binance/upbit public        | PASS                             |
| extension smoke on Binance               | PASS                             |
| Binance Paper usable E2E                 | PASS                             |
| Upbit extension UX + Paper usable E2E    | PASS                             |
| prod extension build (`E2E_TEST_MODE=0`) | PASS                             |
| rust/cargo                               | PASS when cargo present          |
| GitHub Actions remote                    | workflow present; verify on push |

## v1.1 notes

Local learning (opt-in), ko/en i18n, Paper performance analytics, GenericBrokerDetector foundation landed on branch `feat/v1.1-local-learning-i18n-perf-detector`. Existing Binance/Upbit usable claims remain USABLE BETA.

`packages/core/src/index.test.ts`: max capital / zero sell / oversell / cooldown PASS.  
`packages/core/src/paper-controlled.test.ts`: 10@100 → 10@110 PASS.
