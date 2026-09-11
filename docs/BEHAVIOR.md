# Fly Behavior

Fly behavior has explicit model boundaries:

- `mock` uses product heuristics and no connectome.
- `real-connectome` propagates modeled stimulation through a verified subgraph
  of real MaleCNS v1.0 wiring.
- `shuffled-control` uses a labeled topology control and is never described as
  MaleCNS.

**Market behavior semantics are an experimental mapping.** MaleCNS neurons do
not biologically encode stock purchases or sales. `SensoryEncoder` maps market
features to external current on selected real input neurons, sparse modeled
neural dynamics propagate activity, and `BehaviorDecoder` maps output
population activity to intermediate approach, avoidance, exploration, and
arousal drives before selecting a `FlyState`.

No market condition directly returns BUY or SELL from the encoder.

| State               | Motion                                         |
| ------------------- | ---------------------------------------------- |
| `enter`             | Curved flight from outside the viewport        |
| `explore`           | Slow irregular targets across the viewport     |
| `observe_chart`     | Small orbit around chart center                |
| `inspect_portfolio` | Wide, slow pass around the position area       |
| `scan_assets`       | Movement near search/watchlist regions         |
| `interested`        | Faster chart orbit while signals are ambiguous |
| `approach_buy`      | Curved approach and orbit near BUY             |
| `approach_sell`     | Curved approach and orbit near SELL            |
| `panic`             | High speed with frequent direction changes     |
| `leave`             | Natural path to the nearest viewport edge      |
| `sleep`             | Corner rest / cooldown; wings quiet            |
| `login_hint`        | Near login control with a non-interactive tip  |

Extension session UX maps broker presence/login onto these states
(`NO_BROKER` → sleep, `BROKER_LOGGED_OUT` → login_hint, etc.). Approach near
BUY/SELL is an experimental neural-response visualization, not a profit claim.


Velocity steering, sinusoidal curvature, small jitter, state-specific speed, and
orbit targets prevent cursor-like straight-line movement. Wing speed changes by
state and horizontal velocity controls orientation.

The brain is evaluated every two seconds. Transitions use a 1.6-second minimum
duration, score hysteresis, and a longer fallback timeout. Urgent danger may
enter panic immediately. A sustained calm period triggers leave, sleep, and
re-entry without changing the brain evaluation cadence.

## Real versus modeled

Real dataset facts are body IDs, directed source-target topology, and raw
synapse-count weights. Membrane decay, thresholds, timestep, external current,
predicted-neurotransmitter sign interpretation, population assignment, and
behavior decoding are modeled by this project.

The accurate description is: **Neural simulation constrained by the real
MaleCNS connectome. Real fruit-fly wiring, experimental neural dynamics.**
