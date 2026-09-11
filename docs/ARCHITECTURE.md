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
- `@fly/brain-client`: `FlyBrain` implementations. M0–M3 ships only a temporary
  heuristic `MockFlyBrain`.
- `@fly/fly-ui`: React overlay, state stabilization, and RAF movement.
- `@fly/demo`: a safe simulated broker and scenario controls.

Brain evaluation runs every two seconds. Visual movement runs independently via
`requestAnimationFrame`; rendering therefore does not amplify brain calls.
Minimum state duration and drive hysteresis stabilize transitions.

## Future service boundary

`services/brain` will eventually implement `FlyBrain` over HTTP. Connectome
loading, sensory encoding, simulation, and behavior decoding belong there and
must not leak broker selectors into the neural layer.
