# Third-Party Notices

## Drosophila MaleCNS v1.0 connectome

This project contains a filtered, derived connectivity artifact from the
**MaleCNS v1.0 Drosophila connectome**.

- Source: FlyEM Project Team, HHMI Janelia Research Campus
- Collaborators: Cambridge Drosophila Connectomics Group / MRC Laboratory of
  Molecular Biology and Google Connectomics
- Dataset: `male-cns:v1.0`
- Project: https://male-cns.janelia.org/
- Official downloads:
  https://male-cns.janelia.org/download/
- neuPrint: https://neuprint.janelia.org/?dataset=male-cns:v1.0
- License: Creative Commons Attribution (CC BY 4.0)

The repository artifact is modified by selecting a bounded, path-connected
subgraph and converting its real body IDs and raw synapse-count weights into
Parquet and SciPy sparse formats. Exact sources, filters, checksums, neuron
counts, and edge counts are recorded in the adjacent provenance JSON.

Connectivity and neuron annotations come from the official dataset. Market
input encoding, membrane dynamics, neurotransmitter sign assumptions, output
aggregation, and trading-oriented behavior labels are experimental models
created by this project; they are not findings of the MaleCNS authors.

## Project software

Unless a dependency states otherwise, this repository's original source code
is available under the MIT License in [`LICENSE`](LICENSE). Dependency licenses
remain with their respective copyright holders.

## TradeCanvas (market-data adapters)

This repository includes a **minimal adaptation** of public REST kline
fetch/parse logic originally from TradeCanvas, used only as
`MarketDataProvider` implementations (not as a chart UI dependency).

- Project: TradeCanvas
- Repository: https://github.com/bonguynvan/tradecanvas
- Upstream commit: `f7bdb2f3603a9dba72bf767343e692c002f0ea79`
- License: MIT
- Copyright: Copyright (c) 2026 TradeCanvas Contributors
- Reused/adapted files (logic):
  - `packages/core/src/realtime/adapters/BinanceAdapter.ts`
  - `packages/core/src/realtime/adapters/binanceTypes.ts`
  - `packages/core/src/realtime/adapters/BybitAdapter.ts`
  - `packages/core/src/realtime/adapters/CoinbaseAdapter.ts`
  - `packages/core/src/realtime/adapters/KrakenAdapter.ts`
  - `packages/core/src/realtime/adapters/parseUtils.ts` (numeric helpers)
- Local locations:
  - `packages/broker-adapters/src/market-data/tradecanvas/*`

The MIT license text requires retaining the copyright notice; the upstream
LICENSE grant is MIT as published in that repository.

See also [`docs/THIRD_PARTY_ADAPTERS.md`](docs/THIRD_PARTY_ADAPTERS.md).
