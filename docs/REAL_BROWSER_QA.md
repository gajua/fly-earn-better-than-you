# Real Browser QA

Only record results from commands/sessions that actually ran.

Last updated: 2026-09-14  
Branch: `feat/reuse-open-source-broker-adapters`

## Summary

| Broker       | Extension     | Landmarks | Candles | MaleCNS      | Fly          | Paper        | Persistence  | Claim           |
| ------------ | ------------- | --------- | ------- | ------------ | ------------ | ------------ | ------------ | --------------- |
| Binance Spot | PASS          | PASS      | PASS    | PASS         | PASS         | PASS         | PASS         | **USABLE BETA** |
| Upbit        | NOT VERIFIED* | PASS      | PASS    | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PARTIAL         |
| Demo local   | PASS          | PASS      | PASS    | optional     | PASS         | PASS         | PASS         | local           |

\* Upbit packed-extension mount not proven in this session.

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

## Upbit

Public landmarks + official candles: PASS (`e2e/upbit-public.spec.ts`).  
Packed extension Fly/Paper: NOT VERIFIED.

## Other gates

| Command                                  | Result                           |
| ---------------------------------------- | -------------------------------- |
| unit vitest                              | PASS (44)                        |
| python brain tests                       | PASS (8)                         |
| `e2e` demo + binance/upbit public        | PASS                             |
| extension smoke on Binance               | PASS                             |
| Binance Paper usable E2E                 | PASS                             |
| prod extension build (`E2E_TEST_MODE=0`) | PASS                             |
| rust/cargo                               | PASS when cargo present          |
| GitHub Actions remote                    | workflow present; verify on push |

## Risk (unit)

`packages/core/src/index.test.ts`: max capital / zero sell / oversell / cooldown PASS.  
`packages/core/src/paper-controlled.test.ts`: 10@100 → 10@110 PASS.
