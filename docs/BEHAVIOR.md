# Fly Behavior

The current behavior is heuristic, not biological.

| State               | Motion                                         |
| ------------------- | ---------------------------------------------- |
| `enter`             | Curved flight from outside the viewport        |
| `explore`           | Slow irregular targets across the viewport     |
| `observe_chart`     | Small orbit around chart center                |
| `inspect_portfolio` | Wide, slow pass around the position area       |
| `interested`        | Faster chart orbit while signals are ambiguous |
| `approach_buy`      | Curved approach and orbit near BUY             |
| `approach_sell`     | Curved approach and orbit near SELL            |
| `panic`             | High speed with frequent direction changes     |
| `leave`             | Natural path to the nearest viewport edge      |
| `sleep`             | Hidden for a short cooldown before re-entry    |

Velocity steering, sinusoidal curvature, small jitter, state-specific speed, and
orbit targets prevent cursor-like straight-line movement. Wing speed changes by
state and horizontal velocity controls orientation.

The brain is evaluated every two seconds. Transitions use a 1.6-second minimum
duration, score hysteresis, and a longer fallback timeout. Urgent danger may
enter panic immediately. A sustained calm period triggers leave, sleep, and
re-entry without changing the brain evaluation cadence.
