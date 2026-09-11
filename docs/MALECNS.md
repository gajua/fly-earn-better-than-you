# MaleCNS Integration

Target official public dataset:

- neuPrint server: `https://neuprint.janelia.org`
- dataset: `male-cns:v1.0`
- official bulk source:
  `gs://flyem-male-cns/v1.0/connectome-data/flat-connectome/`
- build-only credential: local `NEUPRINT_TOKEN` for neuPrint query mode

## Scientific claim

This project implements a **neural simulation constrained by the real MaleCNS
connectome**. The generated artifact retains real neuron body IDs, directed
connectivity, and official relative synapse-count weights. It does not simulate
the complete fruit-fly brain and does not establish biological stock-market
behavior.

REAL:

- official body IDs and annotations
- official `body_pre → body_post` topology
- raw official synapse-count connection weights

MODELED:

- selected subgraph bounds and weight threshold
- market-to-current `SensoryEncoder`
- membrane decay, threshold, timestep, reset, and stimulation
- predicted-neurotransmitter sign assumptions
- output population aggregation and `BehaviorDecoder`
- all BUY, SELL, danger, curiosity, and investment semantics

## Build and runtime separation

The build script pins and verifies official sources, inspects actual annotation
values, extracts a path-connected subgraph, and writes NPZ, Parquet, and
provenance artifacts. Original bulk files remain ignored. Application runtime
loads only the generated artifact, verifies its digest and referential
integrity, and needs neither neuPrint credentials nor the 1GB source graph.

`real-connectome` fails if verification fails. `shuffled-control` is an
explicitly labeled topology control. `mock` remains a separate heuristic mode.
No mode silently falls back to another.

See [`MALECNS_SELECTION.md`](MALECNS_SELECTION.md) for the generated real
populations and [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) for
attribution.
