from pathlib import Path

import numpy as np
import pytest

from app.connectome import ConnectomeArtifactError, MaleCNSGraph
from app.neural import SensoryEncoder, SparseLIFSimulation
from app.schemas import MarketEnvironmentModel

DATA_DIR = Path(__file__).parents[1] / "data" / "generated"


@pytest.fixture(scope="module")
def graph() -> MaleCNSGraph:
    return MaleCNSGraph.load(DATA_DIR)


def test_real_artifact_has_verified_ids_edges_and_provenance(
    graph: MaleCNSGraph,
) -> None:
    assert len(graph.neuron_ids) > 0
    assert graph.edge_count > 0
    assert graph.provenance["dataset"] == "male-cns:v1.0"
    assert set(graph.source_indices) <= set(range(len(graph.neuron_ids)))
    assert set(graph.target_indices) <= set(range(len(graph.neuron_ids)))


def test_csr_values_equal_official_extracted_weights(
    graph: MaleCNSGraph,
) -> None:
    matrix_values = np.asarray(
        graph.adjacency[graph.target_indices, graph.source_indices]
    ).reshape(-1)
    np.testing.assert_array_equal(matrix_values, graph.raw_weights)


def test_shuffled_control_is_distinct_and_explicit(
    graph: MaleCNSGraph,
) -> None:
    real = graph.modeled_matrix("real-connectome")
    control = graph.modeled_matrix("shuffled-control")
    assert real.shape == control.shape
    assert (real != control).nnz > 0


def test_missing_artifact_fails_instead_of_falling_back(tmp_path: Path) -> None:
    with pytest.raises(ConnectomeArtifactError, match="missing"):
        MaleCNSGraph.load(tmp_path)


def test_real_and_control_propagation_are_not_equivalent(
    graph: MaleCNSGraph,
) -> None:
    environment = MarketEnvironmentModel.model_validate(
        {
            "asset": {
                "symbol": "AAPL",
                "price": 230,
                "changePercent": 4.2,
            },
            "position": {
                "quantity": 12,
                "averagePrice": 210,
                "pnlAmount": 240,
                "pnlPercent": 9.5,
            },
            "market": {
                "momentum": 0.8,
                "volatility": 0.3,
                "volumeStrength": 0.9,
            },
            "ui": {},
        }
    )
    encoder = SensoryEncoder()
    current = encoder.currents(encoder.encode(environment), graph)
    simulator = SparseLIFSimulation()
    real = simulator.run(graph, current, "real-connectome")
    control = simulator.run(graph, current, "shuffled-control")
    assert not np.array_equal(real, control)
