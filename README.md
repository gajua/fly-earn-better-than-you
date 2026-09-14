# 🪰 A fruit fly earns better than you.

### Show it a chart.

### While you're still thinking, the fly is already hovering between BUY and SELL.

**English** | [한국어](README.ko.md)

**Fly Earn Better Than You** is an open-source experiment that connects
real market observations to a fruit-fly neural connectome (MaleCNS)
and lets a tiny fly react directly on supported trading screens.

```text
It watches the chart.
Market movement becomes neural stimulus.
The fly brain reacts.
The fly moves.
```

```text
🧪 Paper-first
🔑 No broker API keys required for supported public observation
🧠 MaleCNS-based connectome simulation
🌍 Community Global Calibration
🇰🇷 한국어 / 🇺🇸 English
```

**Fly does not automatically submit real-money orders.**

Modular neural modules (experimental functional assignments), local observation
learning, and offline calibration are documented in
[docs/MODULAR_NEURAL_ARCHITECTURE.md](docs/MODULAR_NEURAL_ARCHITECTURE.md),
[docs/LEARNING_PIPELINE.md](docs/LEARNING_PIPELINE.md), and
[docs/LOCAL_CALIBRATION.md](docs/LOCAL_CALIBRATION.md).

---

## What does it actually do?

Open Upbit or Binance.

🪰 Fly wakes up.

It can:

- detect the current market
- observe market data across available timeframes
- explore charts and market lists
- feed market observations into MaleCNS
- hover around BUY when its behavior leans toward buying
- hover around SELL when its behavior leans toward selling

Nothing interesting?

It flies somewhere else.

```text
Trading screen
      ↓
Market observations
      ↓
Sensory encoding
      ↓
🧠 MaleCNS
      ↓
Fly behavior
      ↓
🪰
BUY ← → SELL
```

---

## Why a fruit fly?

Why not?

Humans stare at indicators, news, and charts
while trying to decide between BUY and SELL.

This project asks a different question:

> What happens if market observations are fed into
> a real fruit-fly neural connectivity model?

Then it turns the result into something visible:

a tiny fly moving across your trading screen.

### Scientific honesty

MaleCNS does **NOT** understand stocks.

Fly Earn Better Than You does **not** claim that a fruit fly can predict markets.

Market features are encoded into stimuli, processed through the project's
MaleCNS-based simulation pipeline, decoded into behavioral drives,
and visualized through Fly.

Prefer this phrase:

> **Neural simulation constrained by real MaleCNS connectivity.**

This is an **experimental / exploratory** Chrome Extension project.
Paper performance ≠ future investment performance. Not financial advice.

---

## Is the fly actually better than you?

That's the experiment.

Track its Paper trades locally:

- Return
- Realized P&L
- Win rate
- Profit factor
- Max drawdown
- Best / worst trade

See [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md).

---

## 🪰 The fly does not learn alone

Everyone uses the same published Global Calibration.

If you want, you can share anonymous Paper results.

The more people use Fly, and the more Paper results accumulate,
the more evidence we have to evaluate the next shared calibration.

When a candidate passes validation and manual review, a new Global Calibration
is published — and every Fly uses the same improved preset.

```text
1 Fly
   +
100 Fly
   +
1,000 Fly
      ↓
Anonymous Paper observations
      ↓
Candidate calibration
      ↓
Validation
      ↓
New Global Calibration
      ↓
🪰🪰🪰 Everyone gets the same calibration
```

Important:

- MaleCNS itself is **not** retrained
- This is **not** automatic “self-learning AI”
- Better Paper numbers are **not** guaranteed

Versions are independent:

```text
Extension v1.1.0
Global Calibration v1.0.0
MaleCNS dataset v1.0
```

Privacy: no broker login credentials, account numbers, holdings/balances,
real-money trades, cookies/tokens, raw symbols, or email/identity are uploaded.

See [`docs/GLOBAL_LEARNING.md`](docs/GLOBAL_LEARNING.md) and
`apps/extension/.env.example`.

---

## Where can the fly live?

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

---

## Autonomous exploration (Binance Spot)

On Binance, Fly can walk the market instead of only hovering BUY/SELL:

- scan a small USDT universe (BTC / ETH / SOL and a few liquid pairs)
- look at 1d → 4h → 1h → 15m when something looks interesting
- show a compact HUD (symbol, timeframe, curiosity, why it’s looking)
- **not trading is normal** — Paper proposals wait until enough observation

Screen control never clicks BUY/SELL or order submit. Pause from the HUD or popup.

Details: [`docs/AUTONOMOUS_EXPLORATION.md`](docs/AUTONOMOUS_EXPLORATION.md).

---

## Put a fly on your trading screen

```bash
git clone https://github.com/gajua/fly-earn-better-than-you.git
cd fly-earn-better-than-you
pnpm install

# Optional MaleCNS local service (required only for real-connectome mode)
cd services/brain
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
cd ../..

pnpm --filter @fly/extension build
```

1. Open `chrome://extensions`
2. Enable Developer mode → Load unpacked → `apps/extension/dist`
3. First popup open: choose language + Global Learning consent (required)
4. Open a **usable** trade page above, or `pnpm --filter @fly/demo dev`

Default after consent: Paper trading + Mock brain. Same Fly quality whether or
not you contribute anonymous Paper results.

### Binance

1. Load the unpacked extension.
2. Open `https://www.binance.com/en/trade/BTC_USDT?type=spot` (logged out OK).
3. Detect symbol, chart, Max Buy / Max Sell landmarks, public candles.
4. Paper fills stay in IndexedDB. Live order submit is never automated.

### Upbit

1. Load the unpacked extension (`apps/extension/dist`).
2. Popup → Trading `Paper` → Brain `Mock` or `MaleCNS real-connectome` → Save.
3. Open `https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC` (logged out OK).
4. Confirm Fly overlay, 매수/매도 landmarks, official public candles.
5. Paper fills stay in IndexedDB. Live order submit is never automated.

MaleCNS: same local service as Binance (`http://127.0.0.1:8000`). After changing
Brain mode, refresh the Upbit tab.

---

## Technical details

### How the pipeline works

Broker observation → validated candles → MarketFeatureExtractor /
TemporalAggregator → Mock or MaleCNS → BehaviorDecoder →
**GlobalCalibrationPreset** → Fly overlay → ProposalGuard / RiskEngine → Paper
(default) or Live Assist.

### Language

Popup setting: Auto / 한국어 / English (`chrome.storage.local`).
Fly bubbles and popup strings are localized. Business keys stay English.

### Privacy

- Paper history and preferences stay local (IndexedDB)
- Shared learning uploads only when the user opts in (anonymous Paper features)
- No password / OTP / cookie / Authorization capture
- Extension runtime does not call hosted LLMs

### No API keys / No runtime LLM cost

- No broker API keys, secrets, cookies, or OAuth trading tokens by default.
- Market data priority: DOM → embedded public data → public no-auth endpoint →
  `UNAVAILABLE`.
- No synthetic candles / fake timeframes / silent TF fallback.
- Extension runtime does **not** call hosted LLMs.

### MaleCNS service

```bash
cd services/brain
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Popup → Brain → MaleCNS real-connectome. Missing service/artifact → hard fail
(no Mock fallback).

### Paper / Live Assist / Risk / History

- Paper: virtual fills, PositionCycle, local performance.
- Live Assist: approach + proposal only; user places the order.
- Risk: ProposalGuard + RiskEngine.
- History: IndexedDB local-first. Optional Supabase is for shared learning
  aggregation / published presets only — never required for Fly/Paper.

### Generic broker detection

Foundation only: DOM semantic detector for unknown pages → **Paper-only** when
confidence is high. Existing Binance / Upbit adapters remain.

See [`docs/GENERIC_BROKER_DETECTOR.md`](docs/GENERIC_BROKER_DETECTOR.md).

### Add a broker

See [`docs/ADDING_BROKER.md`](docs/ADDING_BROKER.md) and
`packages/broker-adapters/template/`.

### Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm test:python
pnpm test:rust
```

### Limitations

- No automatic live order automation.
- No password / OTP / cookie / Authorization capture.
- No synthetic multi-timeframe invention.
- Logged-in portfolio reconciliation often NOT VERIFIED.
- Stock brokers not in v1.

### License / attribution

MIT project code — see `LICENSE`. Third-party notices:
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md),
[`docs/THIRD_PARTY_ADAPTERS.md`](docs/THIRD_PARTY_ADAPTERS.md).

### Architecture docs

- [`AGENTS.md`](AGENTS.md)
- [`docs/GLOBAL_LEARNING.md`](docs/GLOBAL_LEARNING.md)
- [`docs/EXTENSION_ARCHITECTURE.md`](docs/EXTENSION_ARCHITECTURE.md)
- [`docs/REAL_BROWSER_QA.md`](docs/REAL_BROWSER_QA.md)
- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md)
- [`docs/RELEASE_READINESS.md`](docs/RELEASE_READINESS.md)
- [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md)
- [`docs/LOCAL_LEARNING.md`](docs/LOCAL_LEARNING.md)
