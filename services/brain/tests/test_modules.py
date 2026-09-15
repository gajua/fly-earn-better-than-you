from pathlib import Path

import pytest

from app.connectome import MaleCNSGraph
from app.modules import build_module_definitions, definitions_payload
from app.schemas import MarketEnvironmentModel, MarketModel


@pytest.fixture(scope="module")
def graph() -> MaleCNSGraph:
    data_dir = Path(__file__).parents[1] / "data" / "generated"
    return MaleCNSGraph.load(data_dir)


def test_module_definitions_use_real_neurons_only(graph: MaleCNSGraph) -> None:
    allowed = set(int(x) for x in graph.neuron_ids.tolist())
    modules = build_module_definitions(graph)
    assert len(modules) == 5
    for module in modules:
        assert module.assignment == "experimental"
        ids = (
            list(module.input_neuron_ids)
            + list(module.intermediate_neuron_ids)
            + list(module.output_neuron_ids)
        )
        assert ids, module.id
        assert all(neuron_id in allowed for neuron_id in ids)


def test_modular_evaluate_preserves_graph_path(graph: MaleCNSGraph) -> None:
    from app.modules import ModularMaleCNSBrain

    brain = ModularMaleCNSBrain(graph)
    env = MarketEnvironmentModel(
        market=MarketModel(
            momentum=0.1,
            volatility=0.2,
            volumeStrength=0.3,
            novelty=0.4,
            trendConflict=0.2,
        ),
        ui={},
    )
    result = brain.evaluate(env, "real-connectome")
    assert result.decision.intent in {
        "IGNORE",
        "WATCH",
        "APPROACH_BUY",
        "APPROACH_SELL",
    }
    assert 0 <= result.chart.confidence <= 1


def test_definitions_payload(graph: MaleCNSGraph) -> None:
    payload = definitions_payload(graph)
    assert payload[0]["assignment"] == "experimental"
