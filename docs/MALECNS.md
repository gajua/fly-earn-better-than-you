# MaleCNS Integration

Target public dataset:

- neuPrint server: `https://neuprint.janelia.org`
- dataset: `male-cns:v1.0`
- credential: local `NEUPRINT_TOKEN` environment variable

## Current truth

M0–M3 does not query neuPrint, load connectome data, extract neurons, construct
an adjacency matrix, or simulate neural activity. `MockFlyBrain` is a product
heuristic with small random noise. Its outputs must not be described as
biological decisions.

## Planned pipeline

1. Pin dataset metadata and record query provenance.
2. Extract a documented sensory-to-motor subgraph.
3. Store a versioned sparse adjacency representation.
4. Define a transparent `SensoryEncoder` for market signals.
5. run a validated LIF experiment with explicit biological limitations.
6. Decode activity through a documented `BehaviorDecoder`.
7. Serve the same `BrainOutput` contract used by `MockFlyBrain`.

The FastAPI service currently exposes only `GET /health`. Planned API surfaces
include `GET /neurons/{type}` and `POST /evaluate`, but they are not represented
as implemented endpoints.
