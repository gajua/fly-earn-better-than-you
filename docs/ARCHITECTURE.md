# Architecture

## Center of gravity

```text
Chrome Extension (primary)
  Broker tab -> BrokerAdapter -> observations -> TemporalAggregator
    -> MarketEnvironment -> FlyBrain -> Shadow DOM Fly
    -> RiskEngine / Paper ledger (experimental product layer)

Tauri (optional companion)
  local MaleCNS runtime UX, sleeping desktop Fly, diagnostics,
  future Native Messaging host
```

The brain never receives DOM nodes or broker-specific selectors. Adapters may
read visible market data and geometry, but may not click, dispatch trading
events, inspect cookies, or read authentication fields. Extension Fly uses
`pointer-events: none` inside Shadow DOM.

## Packages

- `@fly/core`: contracts, session mapping, RiskEngine, temporal aggregation,
  paper/performance helpers.
- `@fly/broker-adapters`: `BrokerRegistry`, demo adapter, fixture tests.
- `@fly/brain-client`: Mock / real-connectome / shuffled-control.
- `@fly/fly-ui`: React overlay (demo) + `mountShadowFly` (extension).
- `@fly/demo`: simulated broker page with login/watchlist fixtures.
- `apps/extension`: primary browser UX.
- `apps/desktop`: optional companion.
- `services/brain`: verified Python MaleCNS pipeline (kept).

## Future extension-only mode

A browser-compatible WASM/Rust MaleCNS runtime may later remove the Python
companion requirement. This iteration does not rewrite the verified Python
simulator.

## Connectome pipeline

```text
Official MaleCNS v1.0
  -> versioned NPZ + Parquet + provenance
  -> SensoryEncoder (modeled)
  -> sparse dynamics on REAL topology/weights (modeled dynamics)
  -> BehaviorDecoder (experimental)
  -> BrainOutput
```
