# Real Browser QA

Source of truth companion to `IMPLEMENTATION_STATUS.md`. Only record results
from commands/sessions that actually ran.

Last updated: 2026-09-13  
Branch: `feat/reuse-open-source-broker-adapters`

## Summary

| Broker       | Public page | Symbol | BUY/SELL                      | Market data | Extension Fly | Paper E2E            | Login/Portfolio |
| ------------ | ----------- | ------ | ----------------------------- | ----------- | ------------- | -------------------- | --------------- |
| Binance Spot | PASS        | PASS   | PASS (`Max Buy` / `Max Sell`) | PASS        | NOT VERIFIED  | NOT VERIFIED         | NOT VERIFIED    |
| Upbit        | PASS        | PASS   | PASS (`매수` / `매도`)        | PASS        | NOT VERIFIED  | NOT VERIFIED         | NOT VERIFIED    |
| Demo (local) | PASS        | PASS   | PASS                          | PASS        | PASS          | PASS (no live click) | N/A             |

Do **not** claim Binance USABLE BETA / Stable / Full Support until packed-extension Fly+Paper on live Binance is verified.

## Binance Spot

| Field                                    | Result                                                    |
| ---------------------------------------- | --------------------------------------------------------- |
| Browser                                  | Playwright Chromium + Playwright MCP                      |
| Date                                     | 2026-09-13                                                |
| URL                                      | `https://www.binance.com/en/trade/BTC_USDT?type=spot`     |
| Extension loaded (unpacked on live page) | NOT VERIFIED                                              |
| Page detected                            | PASS                                                      |
| Symbol                                   | PASS (`BTC/USDT` → `BTCUSDT`)                             |
| Chart                                    | PASS                                                      |
| BUY                                      | PASS (`Max Buy` dual-panel; legacy Buy tab fallback kept) |
| SELL                                     | PASS (`Max Sell`)                                         |
| Market data                              | PASS (public REST + unit fixtures)                        |
| Synthetic candles                        | PASS (none)                                               |
| MaleCNS on live page                     | NOT VERIFIED                                              |
| Fly overlay on live page                 | NOT VERIFIED                                              |
| Paper BUY/SELL on live page              | NOT VERIFIED                                              |
| History / persistence on live page       | NOT VERIFIED                                              |
| Login / portfolio                        | NOT VERIFIED                                              |
| Evidence                                 | `docs/assets/qa/binance-public-fly.png`                   |
| `e2e/binance-public.spec.ts`             | PASS (`SKIP_WEB_SERVER=1`)                                |

Locator note: Spot form is dual-panel `Max Buy` / `Max Sell` (Buy/Sell tabs often absent as of 2026-09-13).

## Upbit

| Field                              | Result                                                   |
| ---------------------------------- | -------------------------------------------------------- |
| Browser                            | Playwright Chromium                                      |
| Date                               | 2026-09-13                                               |
| URL                                | `https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC` |
| Extension loaded                   | NOT VERIFIED                                             |
| Page / symbol / chart / BUY / SELL | PASS                                                     |
| Market data                        | PASS                                                     |
| Fly / Paper / History              | NOT VERIFIED                                             |
| Evidence                           | `docs/assets/qa/upbit-public-fly.png`                    |
| `e2e/upbit-public.spec.ts`         | PASS                                                     |

## Demo / harness / controlled paper

| Item                                         | Result                               |
| -------------------------------------------- | ------------------------------------ |
| `e2e/fly-behavior.spec.ts`                   | PASS (order click counts remain 0)   |
| Extension harness (`RUN_EXTENSION_E2E=1`)    | NOT VERIFIED in agent env            |
| `packages/core/src/paper-controlled.test.ts` | PASS (10@100 → 10@110 → +100 / +10%) |
| Python MaleCNS tests                         | PASS (8) when `.venv` present        |
| Live Binance → MaleCNS                       | NOT VERIFIED                         |
| Rust / cargo tests                           | NOT RUN in wrap-up                   |

## Gates (2026-09-13 wrap-up)

| Command                             | Result                        |
| ----------------------------------- | ----------------------------- |
| unit vitest (excl. template)        | PASS (44)                     |
| per-package `tsc --noEmit`          | PASS                          |
| extension prod build                | PASS (`__flyE2EForce` absent) |
| eslint                              | PASS (prior wrap-up run)      |
| `e2e` demo + upbit + binance public | PASS                          |
| packed extension on Binance         | NOT VERIFIED                  |
