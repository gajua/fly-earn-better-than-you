# Fly Earn Better Than You

A tiny observation agent that flies over a simulated trading screen or the
desktop. It never places trades.

The project supports an explicit Mock mode and a local experimental neural
simulation constrained by a derived subgraph of the real MaleCNS v1.0
connectome. Real body IDs, directed topology, and raw connection weights are
kept distinct from modeled dynamics and market semantics.

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

The default remains `mock`, so the demo works without the Python service.

## MaleCNS development mode

Generate or verify the committed derived artifact, then start the local service:

```bash
cd services/brain
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```bash
VITE_FLY_BRAIN_MODE=malecns pnpm dev
```

The Fly Lab Developer Panel displays the mode, verified dataset, real neuron
and edge counts, active real input body IDs, top output body IDs, simulation
latency, and current FlyState. If the service or artifact is unavailable,
MaleCNS mode shows an error and does not silently use MockFlyBrain.

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

## Desktop application

The macOS-first Tauri 2 app creates a transparent primary-monitor overlay. The
native window is always-on-top and ignores cursor events so applications below
remain usable. Lifecycle and diagnostics live in the system tray and a separate
interactive Developer Panel.

```bash
pnpm --filter @fly/desktop tauri dev
CI=true pnpm --filter @fly/desktop tauri build --bundles dmg --no-sign
```

The local `.dmg` is unsigned unless Apple Developer signing credentials are
configured. Windows packaging, notarization, and packaged Python sidecar status
are tracked honestly in [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md).

### Run at startup

Automatic startup is not enabled in this iteration. Launch the app manually or
add it through macOS Login Items after installing the `.app`.

## Chrome extension installation

Build the sensor-only extension:

```bash
pnpm --filter @fly/extension build
```

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and
select `apps/extension/dist`. The extension is a read-only sensor and initially
supports only the local demo. Pair each app launch using the random bridge port
and session token shown by the desktop Developer Panel.

## Privacy and safety

- No password, OTP, cookie, authorization header, account password, or order
  authentication value is read or stored.
- BUY and SELL are visual targets only. No automatic click, event dispatch, or
  order request exists.
- Browser sensor payloads are in memory and sent only to an authenticated
  `127.0.0.1` bridge.
- This is not financial advice.

## MaleCNS provenance

This project uses connectivity derived from the MaleCNS v1.0 Drosophila
connectome. Market inputs and behavioral decoding are experimental mappings
created by this project and are not biological findings.

Running from the generated artifact needs no neuPrint account,
`NEUPRINT_TOKEN`, or original 1GB graph. The current development service still
requires Python; a packaged sidecar is tracked as incomplete.
`NEUPRINT_TOKEN` is accepted only by the developer regeneration path and must
never be committed. See
[`docs/MALECNS.md`](docs/MALECNS.md),
[`docs/MALECNS_SELECTION.md`](docs/MALECNS_SELECTION.md), and
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Repository layout

- `apps/demo` — simulated trading screen and development controls
- `apps/desktop` — Tauri desktop overlay, tray, and loopback bridge
- `apps/extension` — minimum-permission Chrome market sensor
- `packages/core` — serializable environment and brain contracts
- `packages/broker-adapters` — isolated DOM readers
- `packages/brain-client` — temporary MockFlyBrain
- `packages/fly-ui` — overlay, behavior loop, and movement engine
- `services/brain` — future MaleCNS-backed FastAPI service
- `docs` — architecture, behavior, adapter, and connectome notes

See [Architecture](docs/ARCHITECTURE.md) and [Roadmap](docs/ROADMAP.md).
