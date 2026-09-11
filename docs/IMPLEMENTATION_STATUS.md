# Implementation Status

Status reflects executable evidence, not intent.

## DONE

- Official `male-cns:v1.0` subgraph generation through actual neuPrint results.
- Versioned artifact with 249 real body IDs and 7,862 real directed weighted
  edges; raw weight range 1–487.
- Generated NPZ CSR data, neuron Parquet, provenance JSON, component digests,
  and bundle SHA-256 verification.
- Path selection uses real annotations:
  `vnc_sensory|sensory_ascending → ascending_neuron → cb_intrinsic →
  descending_neuron`.
- `SensoryEncoder → real sparse topology → modeled LIF-like dynamics →
  experimental BehaviorDecoder`.
- Explicit `real-connectome`, `shuffled-control`, and `mock` identities.
- FastAPI health, connectome info, and evaluate endpoints.
- TypeScript `createMaleCNSBrain()` with Zod response validation, timeout,
  diagnostics, and no Mock fallback.
- Demo mode picker and Developer Panel diagnostics for real IDs, counts,
  output activity, latency, and FlyState.
- Demo-only Manifest V3 read-only sensor and per-launch bridge pairing UI.
- MIT project license and MaleCNS CC-BY attribution/provenance.
- Real ordering or automatic BUY/SELL actions: none.

## PARTIAL

- Tauri 2 desktop app: macOS primary-monitor transparent, always-on-top,
  click-through overlay, tray, desktop idle/market modes, Developer Panel, and
  authenticated loopback bridge are implemented in source. Final runtime and
  bundle evidence is recorded after the current build gate.
- Multi-monitor: coordinate types and primary-monitor sizing permit extension,
  but only primary-monitor behavior is targeted and tested in this iteration.
- Browser-to-desktop targeting: extension rectangles remain viewport
  coordinates. The desktop uses directional behavior and never claims exact
  native button placement.
- Chrome extension: local demo sensor only; no production broker domain.
- Distribution: macOS local unsigned bundle target only.
- End-user brain packaging: generated data is self-contained, but the current
  neural service is a developer-run Python process.

## NOT IMPLEMENTED

- Windows installer.
- Apple code signing and notarization.
- Packaged PyInstaller sidecar or Rust-native neural simulation.
- Exact Chrome native-window-origin recovery.
- Native Messaging transport.
- Production broker adapters or broad website permissions.
- Run-at-startup integration.
- Any automatic order, order API, button click, credential, cookie, OTP, or
  session-token access.

## Evidence

- Generated bundle SHA-256:
  `7a11ab6883d5913185580fc04a38b08c7eabbf4a544f26b5cd0e28d859bc7d8b`
- Example real edge: `10001 → 10010`, raw weight `1`.
- Python tests exercise artifact integrity, CSR/raw-weight equality,
  real/control distinction, missing-artifact hard failure, and API contracts.
- TypeScript tests exercise Mock behavior, MaleCNS validation/no-fallback,
  movement bounds, extension payload validation, and state transitions.
- Final command outcomes and macOS bundle path are added only after they run.
