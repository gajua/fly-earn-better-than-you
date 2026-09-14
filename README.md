# Fly Earn Better Than You

> Let a fruit fly's real connectome watch the market.

Fly Earn Better Than You is an open-source Chrome experiment that watches
supported trading pages, turns real market observations into neural input, runs
an experimental simulation constrained by the real **MaleCNS v1.0** fruit-fly
connectome, and renders a fly that reacts to the result.

This is **not** financial advice, not a proven trading strategy, and not a claim
that fruit flies predict markets.

```text
Open a supported broker
        ↓
Fly wakes up
        ↓
Real market observations
        ↓
MaleCNS-constrained neural simulation
        ↓
Fly reacts near BUY / SELL
        ↓
Paper trade or Live Assist
        ↓
Local performance history
```

Prefer this phrase for the brain:

> **Neural simulation constrained by real MaleCNS connectivity.**

## How it works

Broker observation → validated candles → MarketFeatureExtractor /
TemporalAggregator → Mock or MaleCNS → BehaviorDecoder → Fly overlay →
ProposalGuard / RiskEngine → Paper (default) or Live Assist.

## No API keys / No runtime LLM cost

- No broker API keys, secrets, cookies, or OAuth trading tokens by default.
- Market data priority: DOM → embedded public data → public no-auth endpoint →
  `UNAVAILABLE`.
- No synthetic candles / fake timeframes / silent TF fallback.
- Extension runtime does **not** call hosted LLMs.

## Supported brokers

| Broker                    | UI              | Market Data      | Paper | Live Assist | Full Support    |
| ------------------------- | --------------- | ---------------- | ----- | ----------- | --------------- |
| Local demo                | DONE            | DONE             | DONE  | PARTIAL     | YES (local)     |
| Binance Spot              | DONE (public)   | DONE             | DONE  | PARTIAL     | **USABLE BETA** |
| Upbit                     | DONE (public)   | DONE             | DONE  | PARTIAL     | **USABLE BETA** |
| Bybit / Kraken / Coinbase | NOT IMPLEMENTED | MARKET DATA ONLY | —     | —           | NO              |
| Stock brokers             | Planned         | —                | —     | —           | NO              |

**Market Data Ready ≠ Full Broker Support.** See
[`docs/REAL_BROWSER_QA.md`](docs/REAL_BROWSER_QA.md).

Binance Spot and Upbit are **USABLE BETA** (packed-extension Paper + UX verified).
Not Stable. Login/portfolio remain NOT VERIFIED.

## Install / Quick start

```bash
git clone https://github.com/gajua/fly-earn-better-than-you.git
cd fly-earn-better-than-you
git checkout feat/reuse-open-source-broker-adapters
pnpm install
pnpm --filter @fly/extension build
```

1. Open `chrome://extensions`
2. Enable Developer mode → Load unpacked → `apps/extension/dist`
3. Open a supported trade page or `pnpm --filter @fly/demo dev`

Default: Paper trading + Mock brain.

## Binance

1. Load the unpacked extension.
2. Open `https://www.binance.com/en/trade/BTC_USDT?type=spot` (logged out OK).
3. Detect symbol, chart, Max Buy / Max Sell landmarks, public candles.
4. Paper fills stay in IndexedDB. Live order submit is never automated.

## Upbit

1. Load the unpacked extension (`apps/extension/dist`).
2. Popup → Trading `Paper` → Brain `Mock` or `MaleCNS real-connectome` → Save.
3. Open `https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC` (logged out OK).
4. Confirm Fly overlay, 매수/매도 landmarks, official public candles.
5. Paper fills stay in IndexedDB. Live order submit is never automated.

MaleCNS: same local service as Binance (`http://127.0.0.1:8000`). After changing
Brain mode, refresh the Upbit tab.

## MaleCNS

```bash
cd services/brain
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Popup → Brain → MaleCNS real-connectome. Missing service/artifact → hard fail
(no Mock fallback).

## Paper / Live Assist / Risk / History

- Paper: virtual fills, PositionCycle, local performance.
- Live Assist: approach + proposal only; user places the order.
- Risk: ProposalGuard + RiskEngine.
- History: IndexedDB local-first. Supabase is future optional sync only.

## Add a broker

See [`docs/ADDING_BROKER.md`](docs/ADDING_BROKER.md) and
`packages/broker-adapters/template/`.

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm test:python
pnpm test:rust
```

## Limitations

- No automatic live order automation.
- No password / OTP / cookie / Authorization capture.
- No synthetic multi-timeframe invention.
- Logged-in portfolio reconciliation often NOT VERIFIED.
- Stock brokers not in v1.

## License / attribution

MIT project code — see `LICENSE`. Third-party notices:
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md),
[`docs/THIRD_PARTY_ADAPTERS.md`](docs/THIRD_PARTY_ADAPTERS.md).

## Architecture docs

- [`AGENTS.md`](AGENTS.md)
- [`docs/EXTENSION_ARCHITECTURE.md`](docs/EXTENSION_ARCHITECTURE.md)
- [`docs/REAL_BROWSER_QA.md`](docs/REAL_BROWSER_QA.md)
- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md)
- [`docs/RELEASE_READINESS.md`](docs/RELEASE_READINESS.md)
