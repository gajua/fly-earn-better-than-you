# Modular Neural Architecture (experimental)

## REAL vs MODELED

| REAL                   | MODELED / EXPERIMENTAL  |
| ---------------------- | ----------------------- |
| MaleCNS topology       | Module role assignments |
| Neuron body IDs        | Market sensory mapping  |
| Edge weights           | LIF dynamics            |
| Single connectome pass | Per-module decoders     |
|                        | Decision fusion         |
|                        | Memory / calibration    |

We do **not** claim that a module’s label (Chart, Volume, etc.) matches a biological role in the fly.

## Modules

```text
MarketScanner → chart / volume / risk observers → DecisionPopulation
```

Each module reads activity from **assigned real neuron populations** after one shared simulation:

```text
market features → real input currents → sparse LIF on real graph → module decoder
```

API: `POST /evaluate/modular` (brain service), definitions at `GET /modules/definitions`.

## Runtime

Offline calibration produces small **presets** (feature weights). Runtime uses preset + current market + MaleCNS — not full historical DB scans.
