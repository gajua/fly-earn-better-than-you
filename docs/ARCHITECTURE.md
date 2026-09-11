# Architecture

## Boundaries

```text
Trading DOM -> BrokerAdapter -> MarketEnvironment -> FlyBrain
             -> BrainOutput -> state machine -> movement -> fly overlay
```

The brain never receives DOM nodes or broker-specific selectors. Adapters may
read visible market data and geometry, but may not click, dispatch trading
events, inspect cookies, or read authentication fields. The fly overlay is
fixed, has `pointer-events: none`, and does not block page interaction.

## Packages

- `@fly/core`: serializable contracts shared by all runtimes.
- `@fly/broker-adapters`: broker detection and environment extraction.
- `@fly/brain-client`: explicit Mock, real-connectome, and shuffled-control
  clients behind the same `FlyBrain` contract.
- `@fly/fly-ui`: React overlay, state stabilization, and RAF movement.
- `@fly/demo`: a safe simulated broker and scenario controls.
- `services/brain`: artifact verification, sparse simulation, encoding,
  decoding, and local FastAPI.
- `apps/desktop`: Tauri lifecycle, transparent screen overlay, tray, and secure
  bridge.
- `apps/extension`: minimum-permission read-only browser sensor.

Brain evaluation runs every two seconds. Visual movement runs independently via
`requestAnimationFrame`; rendering therefore does not amplify brain calls.
Minimum state duration and drive hysteresis stabilize transitions.

## Connectome pipeline

```text
Official MaleCNS v1.0 Feather / neuPrint
  -> reproducible build script
  -> versioned NPZ + Parquet + provenance
  -> verified CSR graph loaded once
  -> SensoryEncoder (modeled external current)
  -> sparse neural dynamics (modeled)
  -> BehaviorDecoder (experimental semantics)
  -> BrainOutput
```

Real-connectome mode never downloads data at runtime and never requires a user
neuPrint token. Missing or corrupt generated artifacts are errors; they do not
activate MockFlyBrain. Raw official integer weights remain distinct from the
normalized/signed matrix used by the modeled dynamics.

## Desktop and extension

The extension does not render a fly. It sends a minimal `MarketEnvironment`
through an authenticated loopback-only bridge. The desktop app owns the
always-on-top fly and stays in `IDLE_DESKTOP` when no fresh market snapshot is
available.

`ViewportRect` values are not `ScreenRect` values. Chrome does not expose a
reliable native browser-window origin to a content script, so the MVP may move
toward a browser region but does not claim exact button landing on the desktop.
The full-screen Tauri overlay ignores native cursor events; its interactive
developer panel is a separate window.
