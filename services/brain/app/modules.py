"""Experimental modular decoders over one real MaleCNS simulation pass."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np

from .connectome import MaleCNSGraph
from .neural import (
    BehaviorDecoder,
    MaleCNSBrain,
    SensoryEncoder,
    SparseLIFSimulation,
    clamp01,
)
from .schemas import (
    BrainOutputModel,
    ChartModuleOutputModel,
    DecisionModuleOutputModel,
    EvaluateModularResponse,
    MarketEnvironmentModel,
    RiskModuleOutputModel,
    ScannerModuleOutputModel,
    SimulationMode,
    VolumeModuleOutputModel,
)

ModuleId = Literal[
    "market_scanner",
    "chart_observer",
    "volume_observer",
    "risk_observer",
    "decision",
]


@dataclass(frozen=True)
class NeuralModuleDefinition:
    id: ModuleId
    input_neuron_ids: tuple[int, ...]
    intermediate_neuron_ids: tuple[int, ...]
    output_neuron_ids: tuple[int, ...]
    description: str
    assignment: Literal["experimental"] = "experimental"


def _body_ids_for_roles(graph: MaleCNSGraph, roles: tuple[str, ...]) -> tuple[int, ...]:
    mask = graph.neurons["role"].isin(roles)
    ids = sorted(int(v) for v in graph.neurons.loc[mask, "bodyId"].tolist())
    return tuple(ids)


def _indices(graph: MaleCNSGraph, body_ids: tuple[int, ...]) -> np.ndarray:
    return np.array(
        [graph.id_to_index[b] for b in body_ids if b in graph.id_to_index],
        dtype=np.int64,
    )


def build_module_definitions(graph: MaleCNSGraph) -> list[NeuralModuleDefinition]:
    sensory = _body_ids_for_roles(graph, ("sensory-input",))
    ascending = _body_ids_for_roles(graph, ("ascending",))
    intermediate = _body_ids_for_roles(graph, ("path-intermediate",))
    output = _body_ids_for_roles(graph, ("descending-output",))

    return [
        NeuralModuleDefinition(
            id="market_scanner",
            input_neuron_ids=sensory,
            intermediate_neuron_ids=ascending,
            output_neuron_ids=ascending[: min(24, len(ascending))],
            description="Experimental scan/novelty population (sensory→ascending).",
        ),
        NeuralModuleDefinition(
            id="chart_observer",
            input_neuron_ids=sensory + ascending[: min(16, len(ascending))],
            intermediate_neuron_ids=intermediate,
            output_neuron_ids=output[: min(16, len(output))],
            description="Experimental trend/momentum population.",
        ),
        NeuralModuleDefinition(
            id="volume_observer",
            input_neuron_ids=sensory,
            intermediate_neuron_ids=ascending,
            output_neuron_ids=intermediate[: min(20, len(intermediate))],
            description="Experimental volume/activity population.",
        ),
        NeuralModuleDefinition(
            id="risk_observer",
            input_neuron_ids=ascending[: min(20, len(ascending))],
            intermediate_neuron_ids=intermediate,
            output_neuron_ids=output,
            description="Experimental volatility/risk population.",
        ),
        NeuralModuleDefinition(
            id="decision",
            input_neuron_ids=(),
            intermediate_neuron_ids=intermediate[: min(32, len(intermediate))],
            output_neuron_ids=output,
            description="Experimental decision population + module fusion.",
        ),
    ]


def _population_drive(activity: np.ndarray, indices: np.ndarray) -> float:
    if len(indices) == 0:
        return 0.0
    peak = max(float(activity[indices].max()), 0.05)
    return clamp01(float(activity[indices].mean()) / peak)


class ModularDecoder:
    """MODELED module outputs from assigned real neuron activity — not biological roles."""

    def chart(
        self, graph: MaleCNSGraph, activity: np.ndarray, defs: NeuralModuleDefinition
    ) -> ChartModuleOutputModel:
        inp = _indices(graph, defs.input_neuron_ids)
        out = _indices(graph, defs.output_neuron_ids)
        split = max(1, len(out) // 2)
        bullish = _population_drive(activity, out[:split])
        bearish = _population_drive(activity, out[split:])
        neutral = clamp01(1 - abs(bullish - bearish))
        conf = clamp01(_population_drive(activity, inp) * 0.5 + bullish * 0.25 + bearish * 0.25)
        return ChartModuleOutputModel(
            bullish=bullish, bearish=bearish, neutral=neutral, confidence=conf
        )

    def volume(
        self, graph: MaleCNSGraph, activity: np.ndarray, defs: NeuralModuleDefinition
    ) -> VolumeModuleOutputModel:
        inp = _indices(graph, defs.input_neuron_ids)
        out = _indices(graph, defs.output_neuron_ids)
        activity_level = _population_drive(activity, out)
        spike = clamp01(activity_level * 1.15 - 0.2)
        conf = clamp01(_population_drive(activity, inp) * 0.6 + activity_level * 0.4)
        return VolumeModuleOutputModel(
            activity=activity_level, spike=spike, confidence=conf
        )

    def risk(
        self, graph: MaleCNSGraph, activity: np.ndarray, defs: NeuralModuleDefinition
    ) -> RiskModuleOutputModel:
        mid = _indices(graph, defs.intermediate_neuron_ids)
        out = _indices(graph, defs.output_neuron_ids)
        risk = _population_drive(activity, out)
        instability = clamp01(_population_drive(activity, mid) * 0.7 + risk * 0.3)
        conf = clamp01(risk * 0.55 + instability * 0.45)
        return RiskModuleOutputModel(risk=risk, instability=instability, confidence=conf)

    def scanner(
        self,
        graph: MaleCNSGraph,
        activity: np.ndarray,
        defs: NeuralModuleDefinition,
        environment: MarketEnvironmentModel,
    ) -> ScannerModuleOutputModel:
        inp = _indices(graph, defs.input_neuron_ids)
        out = _indices(graph, defs.output_neuron_ids)
        novelty = clamp01(environment.market.novelty or 0)
        interest = clamp01(
            _population_drive(activity, out) * 0.55
            + _population_drive(activity, inp) * 0.25
            + novelty * 0.2
        )
        revisit = clamp01(1 - interest * 0.35)
        return ScannerModuleOutputModel(
            interest=interest, novelty=novelty, revisitScore=revisit
        )

    def decision(
        self,
        graph: MaleCNSGraph,
        activity: np.ndarray,
        defs: NeuralModuleDefinition,
        chart: ChartModuleOutputModel,
        volume: VolumeModuleOutputModel,
        risk: RiskModuleOutputModel,
        scanner: ScannerModuleOutputModel,
    ) -> DecisionModuleOutputModel:
        out = _indices(graph, defs.output_neuron_ids)
        split = max(1, len(out) // 2)
        approach = _population_drive(activity, out[:split])
        avoid = _population_drive(activity, out[split:])

        buy_drive = clamp01(
            chart.bullish * 0.32
            + volume.activity * 0.18
            + scanner.interest * 0.2
            + approach * 0.2
            - risk.risk * 0.25
        )
        sell_drive = clamp01(
            chart.bearish * 0.32
            + risk.instability * 0.22
            + avoid * 0.2
            + volume.spike * 0.08
            - chart.bullish * 0.1
        )
        confidence = clamp01(
            (chart.confidence + volume.confidence + risk.confidence) / 3
        )
        if max(buy_drive, sell_drive) < 0.52 or confidence < 0.35:
            intent: Literal["IGNORE", "WATCH", "APPROACH_BUY", "APPROACH_SELL"] = (
                "WATCH" if max(buy_drive, sell_drive, scanner.interest) >= 0.38 else "IGNORE"
            )
        elif buy_drive >= 0.58 and buy_drive > sell_drive + 0.08:
            intent = "APPROACH_BUY"
        elif sell_drive >= 0.58 and sell_drive > buy_drive + 0.08:
            intent = "APPROACH_SELL"
        else:
            intent = "WATCH"
        return DecisionModuleOutputModel(
            intent=intent,
            buyDrive=buy_drive,
            sellDrive=sell_drive,
            confidence=confidence,
        )


class ModularMaleCNSBrain:
    def __init__(self, graph: MaleCNSGraph) -> None:
        self.graph = graph
        self.encoder = SensoryEncoder()
        self.simulation = SparseLIFSimulation()
        self.legacy_decoder = BehaviorDecoder()
        self.modular_decoder = ModularDecoder()
        self.definitions = build_module_definitions(graph)

    def evaluate(
        self, environment: MarketEnvironmentModel, mode: SimulationMode
    ) -> EvaluateModularResponse:
        stimulus = self.encoder.encode(environment)
        currents = self.encoder.currents(stimulus, self.graph)
        activity = self.simulation.run(self.graph, currents, mode)

        by_id = {d.id: d for d in self.definitions}
        chart = self.modular_decoder.chart(
            self.graph, activity, by_id["chart_observer"]
        )
        volume = self.modular_decoder.volume(
            self.graph, activity, by_id["volume_observer"]
        )
        risk = self.modular_decoder.risk(self.graph, activity, by_id["risk_observer"])
        scanner = self.modular_decoder.scanner(
            self.graph, activity, by_id["market_scanner"], environment
        )
        decision = self.modular_decoder.decision(
            self.graph,
            activity,
            by_id["decision"],
            chart,
            volume,
            risk,
            scanner,
        )

        legacy = self.legacy_decoder.decode(self.graph, activity)
        brain = BrainOutputModel(
            state=_decision_to_fly_state(decision, legacy.state),
            buyDrive=decision.buyDrive,
            sellDrive=decision.sellDrive,
            curiosity=clamp01(scanner.interest * 0.6 + legacy.curiosity * 0.4),
            danger=clamp01(risk.risk * 0.65 + legacy.danger * 0.35),
            activity=clamp01(volume.activity * 0.5 + legacy.activity * 0.5),
        )

        return EvaluateModularResponse(
            brainOutput=brain,
            chart=chart,
            volume=volume,
            risk=risk,
            scanner=scanner,
            decision=decision,
            modelVersion="modular-v1",
        )


def _decision_to_fly_state(
    decision: DecisionModuleOutputModel, fallback: str
) -> str:
    if decision.intent == "APPROACH_BUY":
        return "approach_buy"
    if decision.intent == "APPROACH_SELL":
        return "approach_sell"
    if decision.intent == "WATCH":
        return "observe_chart"
    return fallback if fallback in {"explore", "observe_chart", "scan_assets"} else "explore"


def definitions_payload(graph: MaleCNSGraph) -> list[dict[str, object]]:
    return [
        {
            "id": d.id,
            "inputNeuronIds": list(d.input_neuron_ids),
            "intermediateNeuronIds": list(d.intermediate_neuron_ids),
            "outputNeuronIds": list(d.output_neuron_ids),
            "description": d.description,
            "assignment": d.assignment,
        }
        for d in build_module_definitions(graph)
    ]
