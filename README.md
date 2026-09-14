# Fly Earn Better Than You

> A fruit fly with a real connectome walks onto your trading page and starts
> judging candles. You wanted alpha. You got entomology.

**Fly Earn Better Than You** is an open-source Chrome experiment that watches
supported trading pages, feeds **real** market observations into a neural
simulation constrained by the real **MaleCNS v1.0** fruit-fly connectome, and
draws a tiny fly that buzzes toward BUY / SELL like it has opinions (it does
not; it has synapses and vibes).

This is **not** financial advice, not a proven trading strategy, and not a claim
that fruit flies predict markets. If the fly looks confident, that is your
problem, not its edge.

```text
Open a supported broker
        ↓
Fly wakes up (politely, with pointer-events: none)
        ↓
Real market observations (no fake candles)
        ↓
MaleCNS-constrained neural simulation
        ↓
Fly reacts near BUY / SELL
        ↓
Paper trade (default) or Live Assist
        ↓
Local performance history
```

Prefer this phrase for the brain:

> **Neural simulation constrained by real MaleCNS connectivity.**

## Currently usable / recognizable exchanges

Honest split: **usable** means the extension detects the page, mounts Fly, reads
real market data, and can Paper-trade. **Recognizable (data only)** means public
candles exist in code, but there is **no** on-page Fly UI adapter yet.

### Usable now (USABLE BETA)

| Exchange / surface | What Fly does today                                                                   | Example URL                                              |
| ------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Local demo**     | Full local playground                                                                 | `pnpm --filter @fly/demo dev`                            |
| **Binance Spot**   | Detect trade page, chart, Max Buy / Max Sell, public candles, Fly overlay, Paper      | `https://www.binance.com/en/trade/BTC_USDT?type=spot`    |
| **Upbit**          | Detect exchange page, chart, 매수 / 매도, official public candles, Fly overlay, Paper | `https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC` |

Binance Spot + Upbit are **USABLE BETA** (packed-extension Paper + UX verified).
Not Stable. Login / portfolio remain **NOT VERIFIED**. Live order click/submit is
**never** automated.

### Recognizable — market data only (not usable in the UI yet)

| Exchange | Status                                          |
| -------- | ----------------------------------------------- |
| Bybit    | Public candle provider only — no Fly UI adapter |
| Kraken   | Public candle provider only — no Fly UI adapter |
| Coinbase | Public candle provider only — no Fly UI adapter |

### Not yet

| Surface                     | Status        |
| --------------------------- | ------------- |
| Stock brokers               | Planned       |
| Automatic live order submit | Will not ship |

**Market Data Ready ≠ Full Broker Support.** Evidence:
[`docs/REAL_BROWSER_QA.md`](docs/REAL_BROWSER_QA.md),
[`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md).

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

## Install / Quick start

```bash
git clone https://github.com/gajua/fly-earn-better-than-you.git
cd fly-earn-better-than-you
git checkout main
pnpm install
pnpm --filter @fly/extension build
```

1. Open `chrome://extensions`
2. Enable Developer mode → Load unpacked → `apps/extension/dist`
3. Open a **usable** trade page above, or `pnpm --filter @fly/demo dev`

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
