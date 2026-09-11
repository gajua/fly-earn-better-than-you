# Fly Earn Better Than You

A tiny observation agent that watches supported trading screens from a Chrome
extension first. It can also optionally appear on the desktop via Tauri. It
never auto-submits live broker orders.

## Easy explanation

A fly wakes up when you open a supported trading page, looks around the chart
and buttons, and may hover near BUY or SELL when its experimental brain response
is strong. In Paper mode it can keep a virtual ledger. In Live-assist mode it
only asks you to review — you confirm any real order yourself.

## Precise explanation

Market observations are encoded into sensory features and evaluated by either a
heuristic Mock brain or an experimental simulation constrained by a derived
subgraph of real MaleCNS v1.0 connectivity (real body IDs, directed edges, raw
weights). A stronger approach-like response is **not** a prediction that a stock
will rise.

## Architecture center

**Extension-first.** The content script renders a Shadow DOM Fly on the broker
page. Tauri remains an optional MaleCNS companion / desktop sleeper.

See [`docs/EXTENSION_ARCHITECTURE.md`](docs/EXTENSION_ARCHITECTURE.md).

## Quick start

```bash
pnpm install
pnpm dev
pnpm --filter @fly/extension build
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Load `apps/extension/dist`
as an unpacked Chrome extension. Default brain mode in the popup is Mock; Paper
trading is the default trading mode.

## MaleCNS

```bash
cd services/brain
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Set extension popup Brain to `real-connectome`, or run the demo with
`VITE_FLY_BRAIN_MODE=malecns`. Missing MaleCNS service fails real-connectome —
it never silently falls back to Mock.

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm test:python
```

## First supported broker

This iteration’s vertical slice broker is the **local demo**
(`127.0.0.1:5173/5174`) with explicit `data-*` attributes. Production brokers
are registry-ready but not implemented.

## Desktop companion

Tauri is not deleted. It is no longer the primary market overlay.

```bash
pnpm --filter @fly/desktop tauri dev
```

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/EXTENSION_ARCHITECTURE.md`](docs/EXTENSION_ARCHITECTURE.md)
- [`docs/RISK_POLICY.md`](docs/RISK_POLICY.md)
- [`docs/PAPER_TRADING.md`](docs/PAPER_TRADING.md)
- [`docs/TRADE_LEDGER.md`](docs/TRADE_LEDGER.md)
- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md)
- [`docs/MALECNS_SELECTION.md`](docs/MALECNS_SELECTION.md)
