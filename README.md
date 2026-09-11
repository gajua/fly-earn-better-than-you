# Fly Earn Better Than You

A tiny observation agent that flies over a simulated trading screen. The current
prototype uses a transparent, non-interactive overlay and a deterministic
heuristic brain. It never places trades.

> M0–M3 status: working demo, fly overlay, state machine, and MockFlyBrain.
> MaleCNS data is **not used yet** and this is **not a biological simulation**.

## Quick start

Requirements: Node.js 22+ and pnpm 10+.

```bash
pnpm install
pnpm dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173), then use the Fly Lab
buttons. Bullish attracts the fly to BUY, Bearish to SELL, Volatile and Big
Loss trigger panic, Big Profit attracts it to Portfolio, and Calm lets it watch
the chart before periodically leaving and returning.

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Playwright downloads its Chromium binary on first setup:

```bash
pnpm exec playwright install chromium
```

## Brain service

The Python service is only an integration boundary at this milestone.

```bash
cd services/brain
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
curl http://127.0.0.1:8000/health
```

Copy `.env.example` to `.env` only when neuPrint work begins. Never commit
`NEUPRINT_TOKEN`.

## Repository layout

- `apps/demo` — simulated trading screen and development controls
- `packages/core` — serializable environment and brain contracts
- `packages/broker-adapters` — isolated DOM readers
- `packages/brain-client` — temporary MockFlyBrain
- `packages/fly-ui` — overlay, behavior loop, and movement engine
- `services/brain` — future MaleCNS-backed FastAPI service
- `docs` — architecture, behavior, adapter, and connectome notes

See [Architecture](docs/ARCHITECTURE.md) and [Roadmap](docs/ROADMAP.md).
