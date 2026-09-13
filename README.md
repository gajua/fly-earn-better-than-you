# 🪰 Fly Earn Better Than You

> Let a fruit fly's real connectome watch the market.

Fly Earn Better Than You is an open-source Chrome experiment that watches supported trading pages, turns real market observations into neural input, runs an experimental simulation constrained by the real **MaleCNS v1.0** fruit-fly connectome, and renders a fly that reacts to the result.

한국어로 간단히 말하면: 거래소 화면과 실제 시장 데이터를 초파리 신경망 실험에 넣고, 반응이 강하면 초파리가 BUY/SELL 영역 근처를 날아다니는 프로젝트입니다.

This is **not** financial advice, not a proven trading strategy, and not a biological claim that fruit flies can predict markets.

```text
Open a supported broker
        ↓
Fly wakes up 🪰
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

## What is real vs experimental?

**Real MaleCNS data used by this project**

- MaleCNS v1.0 neuron body IDs
- directed connectivity
- raw connectivity weights
- a derived, reproducible connectome subgraph committed with provenance

**Modeled / experimental parts**

- market data → sensory encoding
- LIF-like neural dynamics
- neurotransmitter-sign assumptions
- neural output → Fly behavior
- any interpretation of Fly behavior as trading interest

The correct technical description is:

> **Real MaleCNS wiring + modeled neural dynamics + experimental market/behavior mapping.**

## No broker API keys required

The project does **not** require users to enter broker API keys, secrets, trading tokens, cookies, or OAuth credentials.

Market data is acquired in this order where available:

```text
visible broker DOM
    ↓
public embedded page data
    ↓
official/public read-only market endpoint
    ↓
UNAVAILABLE
```

Some providers use public, read-only exchange endpoints for OHLCV data. These endpoints require **no user key or secret**.

The extension does not silently invent candles or synthetic timeframes when data is unavailable.

## No runtime LLM cost

The extension does not call OpenAI, Anthropic, Gemini, or another hosted LLM at runtime.

**Runtime LLM token cost: 0.**

AI tools may be used during development to build or verify broker adapters, but live market observation is deterministic code.

## Supported brokers

Support levels:

- **Beta** — live public page recognition and real market data work, but logged-in/portfolio edge cases are not fully verified.
- **Partial** — only part of the broker UX is supported.
- **Market data only** — OHLCV provider exists, but the Fly does not yet understand that broker's trading UI.
- **Planned** — not implemented yet.

| Broker | Market | UI detection | Real market data | Paper | Live Assist | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Local demo | Simulated | ✅ | ✅ explicit demo data | ✅ | Partial | Stable dev fixture |
| Binance | Spot crypto | ✅ public trade page | ✅ public REST, no user key | ✅ guest paper path | Partial | **Beta** |
| Upbit | Spot crypto | ⚠️ partial | ✅ official public REST, no user key | Partial | Partial | **Partial** |
| Bybit | Crypto | ❌ | ✅ provider ready | ❌ | ❌ | Market data only |
| Kraken | Crypto | ❌ | ✅ provider ready | ❌ | ❌ | Market data only |
| Coinbase | Crypto | ❌ | ✅ provider ready; 4h unavailable | ❌ | ❌ | Market data only |
| Korean stock brokers | Cash stocks | ❌ | ❌ | ❌ | ❌ | Planned |
| US/global stock brokers | Cash stocks | ❌ | ❌ | ❌ | ❌ | Planned |

**Market Data Ready ≠ Full Broker Supported.** A broker needs both a UI adapter and a market-data provider before the Fly can work end-to-end on its website.

See [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) for the evidence behind this table.

## How it works

A supported page goes through this pipeline:

```text
Chrome Extension
    ↓
Broker UI Adapter
    ├─ page type
    ├─ login state
    ├─ current instrument
    ├─ chart location
    ├─ BUY target
    ├─ SELL target
    └─ modal state

MarketDataProvider
    ├─ 1m
    ├─ 5m
    ├─ 15m
    ├─ 1h
    ├─ 4h
    └─ 1d
        ↓
Candle validation
        ↓
Broker-neutral feature extraction
        ├─ return
        ├─ momentum
        ├─ volatility
        └─ volume strength
        ↓
TemporalAggregator
        ↓
SensoryEncoder
        ↓
MaleCNS-derived sparse connectome
        ↓
Modeled neural simulation
        ↓
BehaviorDecoder
        ↓
FlyState
        ↓
🪰 Fly movement
```

The Fly does not use a direct rule such as `price up → BUY`.

## Trading modes

### Paper Trading — default

Paper mode uses real observations but never moves real money.

```text
Fly response
    ↓
OrderProposal
    ↓
ProposalGuard
    ↓
RiskEngine
    ↓
Virtual fill
    ↓
PositionCycle
    ↓
IndexedDB
    ↓
Performance
```

Paper mode is the recommended mode for testing the project.

### Live Assist

Live Assist can visually move the Fly toward a BUY or SELL area and surface a proposal.

It does **not** automatically submit live broker orders.

The extension does not automatically:

- click BUY / SELL
- submit an order form
- confirm an order modal
- press trading shortcuts
- inject a native mouse click

The user remains responsible for any real order.

## Risk controls

The RiskEngine is separate from MaleCNS. Neural output cannot bypass it.

Current controls include:

- maximum Fly-controlled trading capital
- maximum single-order value
- maximum per-instrument position value
- maximum daily new exposure
- duplicate proposal / cooldown protection
- rejection of SELL without a position
- rejection of SELL above owned quantity

Example: if `Max trading capital` is set to `₩1,000,000`, new Paper/Assist BUY exposure is rejected when it would exceed that limit.

## Trade history

Trade and position-cycle history is local-first.

Closed trades are modeled so the UI can summarize:

```text
NVDA
Buy   171.20
Sell  177.80
+3.86%
```

Open positions can track a latest-known market price for unrealized performance.

Detailed fills / cycles live locally in **IndexedDB**. Preferences and lightweight state use Chrome local storage. Cloud sync is not required.

Broker passwords, OTPs, cookies, session tokens, and trading secrets are not stored.

## Install the extension

Requirements:

- Node.js 22+
- pnpm 10+
- Chrome / Chromium 116+

```bash
git clone https://github.com/gajua/fly-earn-better-than-you.git
cd fly-earn-better-than-you
git checkout feat/reuse-open-source-broker-adapters

pnpm install
pnpm --filter @fly/extension build
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `apps/extension/dist`.
5. Pin **Fly Earn Better Than You** if desired.

The extension popup currently exposes:

- `Trading`: Paper / Live-assist
- `Brain`: Mock / MaleCNS real-connectome / Shuffled control
- `Max trading capital (KRW)`
- Paper performance
- Selector / page diagnostics
- Delete local Fly history

## Try it on Binance Spot

Binance Spot is the first production vertical slice.

1. Build and load the extension.
2. Open a public Binance Spot trading page such as a BTC/USDT pair.
3. Open the Fly extension popup.
4. Keep `Trading` on **Paper**.
5. For a UI-only smoke test, `Brain: Mock` works without Python.
6. For the real connectome path, start the MaleCNS service below and select `MaleCNS real-connectome`.
7. Confirm the popup diagnostics detect Binance, the current symbol, page context, and available market-data timeframes.
8. Confirm the Fly overlay appears on the trading page.
9. Paper proposals/fills, when generated, are stored locally and included in Paper performance.

Current Binance limitations:

- public trade page DOM and public market-data access have been verified
- logged-in portfolio/history reconciliation is not fully verified
- unattended live order execution is intentionally not implemented

## Try it on Upbit

Upbit support is currently **Partial**.

The current adapter can recognize the public exchange page, symbol/query structure, chart landmark, buy/sell tabs, and official public candle endpoint. Logged-in portfolio and complete extension end-to-end QA are not yet considered fully verified.

Use Paper mode only while validating this adapter.

## Run the MaleCNS brain

The default extension brain is Mock so the UI can run without Python.

For the actual MaleCNS-derived simulation:

```bash
cd services/brain
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Then open the extension popup and choose:

```text
Brain → MaleCNS real-connectome
```

If the service or committed artifact is unavailable, real-connectome mode fails closed. It does **not** silently fall back to Mock.

### Brain modes

- **Mock** — deterministic UX / integration testing brain.
- **MaleCNS real-connectome** — real MaleCNS-derived IDs, connectivity and weights with modeled neural dynamics.
- **Shuffled control** — topology-control mode for scientific comparison.

## Development demo

The repository also includes a local deterministic broker fixture:

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5173`, then load the unpacked extension. The local demo is useful for repeatable UI and Paper Trading tests.

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

`pnpm test:python` expects the Python virtual environment under `services/brain/.venv`.

## Add a broker

Broker support is deliberately split into two independent pieces:

```text
BrokerUIAdapter
+
MarketDataProvider
```

A community adapter should ideally include:

- broker manifest / capability declaration
- page classifier
- robust locators
- sanitized DOM fixtures
- market-data provider or documented public data source
- tests
- verified support status

Existing open-source market-data implementations should be reused when licensing and maintenance make that safe.

See [`docs/BROKER_ADAPTER.md`](docs/BROKER_ADAPTER.md), [`docs/THIRD_PARTY_ADAPTERS.md`](docs/THIRD_PARTY_ADAPTERS.md), and [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md).

## Privacy & safety

The project follows a fail-closed policy.

If the adapter cannot confidently identify the page, data, or BUY/SELL target, it should stop producing trade proposals rather than guess.

The extension does not intentionally read or persist:

- passwords
- OTP codes
- broker cookies
- session tokens
- authorization headers
- broker API secrets

## Known limitations

- Production broker UIs can change and break locators.
- Binance logged-in portfolio/live reconciliation is still partial.
- Upbit remains partial.
- Bybit, Kraken, and Coinbase currently have market-data providers but no production UI adapter.
- Stock-broker adapters are not implemented yet.
- MaleCNS mode currently requires the local Python service.
- Full production-host unpacked-extension E2E evidence is still being expanded.
- Automatic live order submission is intentionally absent.

## Third-party work

Market-data adapter logic includes a minimal MIT-licensed adaptation from **TradeCanvas** rather than bundling its full chart UI package.

See:

- [`docs/THIRD_PARTY_ADAPTERS.md`](docs/THIRD_PARTY_ADAPTERS.md)
- [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)

MaleCNS attribution and provenance are documented in:

- [`docs/MALECNS.md`](docs/MALECNS.md)
- [`docs/MALECNS_SELECTION.md`](docs/MALECNS_SELECTION.md)
- [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)

## Architecture docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/EXTENSION_ARCHITECTURE.md`](docs/EXTENSION_ARCHITECTURE.md)
- [`docs/RISK_POLICY.md`](docs/RISK_POLICY.md)
- [`docs/PAPER_TRADING.md`](docs/PAPER_TRADING.md)
- [`docs/TRADE_LEDGER.md`](docs/TRADE_LEDGER.md)
- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md)

## License

The project's original source code is licensed under the **MIT License**. Third-party code and datasets remain under their respective licenses.
