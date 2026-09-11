# Roadmap

- **M0 — Repository bootstrap:** pnpm workspace, shared tooling, docs.
- **M1 — Demo trading environment:** safe simulated market and scenarios.
- **M2 — Fly overlay:** non-interactive animated viewport overlay.
- **M3 — Fly behavior + MockBrain:** stabilized state machine and heuristics.
- **M4 — Chrome Extension injection:** Manifest V3 content script runtime.
- **M5 — BrokerAdapter architecture:** extension-side detection and selection.
- **M6 — First real broker adapter:** read-only integration with one broker.
- **M7 — neuPrint integration:** authenticated MaleCNS metadata access.
- **M8 — MaleCNS subgraph extraction:** reproducible neuron/connectivity subsets.
- **M9 — Biological neural simulation:** documented sparse LIF experiment.
- **M10 — SensoryEncoder / BehaviorDecoder:** explicit market-to-neural mapping.
- **M11 — Portfolio awareness:** safe, local, minimal position observations.
- **M12 — Multi-broker support:** tested adapter registry and generic fallback.
- **M13 — Backtesting / observation study:** offline behavior evaluation.
- **M14 — Desktop overlay:** opt-in observer outside browser surfaces.

M0–M5 and the first macOS/Desktop scientific vertical slice for M7–M10/M14 are
implemented or in active verification. M6 remains a local-demo adapter rather
than a real broker integration. See
[`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md) for evidence and exact
partial boundaries.

Automatic order execution is intentionally absent from every milestone.
