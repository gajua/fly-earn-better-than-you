"""Modeled encoding, sparse dynamics, and experimental behavior decoding."""

from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter

import numpy as np

from .connectome import MaleCNSGraph
from .schemas import (
    BrainOutputModel,
    ConnectomeDebugModel,
    EvaluateResponse,
    MarketEnvironmentModel,
    NeuronActivityModel,
    SimulationMode,
)


def clamp01(value: float) -> float:
    return min(1.0, max(0.0, float(value)))


@dataclass(frozen=True)
class SensoryStimulus:
    visual_positive: float
    visual_negative: float
    motion_intensity: float
    volatility_stimulus: float
    reward_like_stimulus: float
    novelty_stimulus: float
    conflict_stimulus: float


class SensoryEncoder:
    """Experimental market-to-current mapping, not a biological claim."""

    channels = (
        "visual_positive",
        "visual_negative",
        "motion_intensity",
        "volatility_stimulus",
        "reward_like_stimulus",
        "novelty_stimulus",
        "conflict_stimulus",
    )

    def encode(self, environment: MarketEnvironmentModel) -> SensoryStimulus:
        momentum = environment.market.momentum
        change = environment.asset.changePercent if environment.asset else 0.0
        pnl = environment.position.pnlPercent if environment.position else 0.0
        novelty = environment.market.novelty or 0.0
        conflict = environment.market.trendConflict or 0.0
        return SensoryStimulus(
            visual_positive=clamp01(
                max(0.0, momentum) * 0.7 + max(0.0, change) / 20 * 0.3
            ),
            visual_negative=clamp01(
                max(0.0, -momentum) * 0.7 + max(0.0, -change) / 20 * 0.3
            ),
            motion_intensity=clamp01(
                abs(momentum) * 0.65
                + environment.market.volumeStrength * 0.35
            ),
            volatility_stimulus=clamp01(environment.market.volatility),
            reward_like_stimulus=clamp01((pnl + 20.0) / 40.0),
            # MODELED mapping onto real sensory input neurons — not a biological claim.
            novelty_stimulus=clamp01(novelty),
            conflict_stimulus=clamp01(conflict),
        )

    def currents(
        self,
        stimulus: SensoryStimulus,
        graph: MaleCNSGraph,
    ) -> np.ndarray:
        current = np.zeros(len(graph.neuron_ids), dtype=np.float64)
        values = np.array(
            [getattr(stimulus, channel) for channel in self.channels],
            dtype=np.float64,
        )
        # Deterministic, versioned modeled assignment over real input body IDs.
        for ordinal, index in enumerate(graph.input_indices):
            current[index] = values[ordinal % len(values)] * 1.35
        return current


class SparseLIFSimulation:
    """Simple modeled LIF-like dynamics over a real sparse topology."""

    def __init__(
        self,
        *,
        steps: int = 48,
        decay: float = 0.86,
        threshold: float = 0.58,
        coupling: float = 1.15,
    ) -> None:
        self.steps = steps
        self.decay = decay
        self.threshold = threshold
        self.coupling = coupling

    def run(
        self,
        graph: MaleCNSGraph,
        external_current: np.ndarray,
        mode: SimulationMode,
    ) -> np.ndarray:
        matrix = graph.modeled_matrix(mode)
        membrane = np.zeros(len(graph.neuron_ids), dtype=np.float64)
        spikes = np.zeros_like(membrane)
        spike_count = np.zeros_like(membrane)
        for _ in range(self.steps):
            membrane = (
                membrane * self.decay
                + matrix @ spikes * self.coupling
                + external_current
            )
            spikes = (membrane >= self.threshold).astype(np.float64)
            spike_count += spikes
            membrane[spikes > 0] = 0.0
        return spike_count / self.steps


class BehaviorDecoder:
    """Experimental output-population-to-market behavior mapping."""

    def decode(
        self, graph: MaleCNSGraph, activity: np.ndarray
    ) -> BrainOutputModel:
        output_indices = graph.output_indices[
            np.argsort(graph.neuron_ids[graph.output_indices])
        ]
        populations = np.array_split(output_indices, 4)
        peak = max(float(activity[output_indices].max()), 0.05)

        def population_drive(indices: np.ndarray) -> float:
            if len(indices) == 0:
                return 0.0
            return clamp01(float(activity[indices].mean()) / peak)

        approach = population_drive(populations[0])
        avoidance = population_drive(populations[1])
        exploration = population_drive(populations[2])
        arousal = population_drive(populations[3])
        total_activity = clamp01(float(activity.mean()) * 6)

        buy_drive = clamp01(approach * 0.82 + exploration * 0.18)
        sell_drive = clamp01(avoidance * 0.82 + arousal * 0.18)
        curiosity = clamp01(exploration * 0.72 + (1 - total_activity) * 0.28)
        danger = clamp01(arousal * 0.72 + total_activity * 0.28)
        activity_drive = clamp01(
            total_activity * 0.55 + max(approach, avoidance, arousal) * 0.45
        )

        if danger >= 0.7:
            state = "panic"
        elif sell_drive >= 0.56 and sell_drive > buy_drive + 0.06:
            state = "approach_sell"
        elif buy_drive >= 0.56 and buy_drive > sell_drive + 0.06:
            state = "approach_buy"
        elif curiosity >= 0.48:
            # Default: attend to chart. Stronger exploration → scan list when present.
            state = "observe_chart"
        elif activity_drive < 0.12:
            state = "leave"
        else:
            state = "explore"

        return BrainOutputModel(
            state=state,
            buyDrive=buy_drive,
            sellDrive=sell_drive,
            curiosity=curiosity,
            danger=danger,
            activity=activity_drive,
        )


class MaleCNSBrain:
    def __init__(self, graph: MaleCNSGraph) -> None:
        self.graph = graph
        self.encoder = SensoryEncoder()
        self.simulation = SparseLIFSimulation()
        self.decoder = BehaviorDecoder()

    def evaluate(
        self,
        environment: MarketEnvironmentModel,
        mode: SimulationMode,
    ) -> EvaluateResponse:
        started = perf_counter()
        stimulus = self.encoder.encode(environment)
        currents = self.encoder.currents(stimulus, self.graph)
        activity = self.simulation.run(self.graph, currents, mode)
        output = self.decoder.decode(self.graph, activity)

        # Landmark-aware locomotion only: keep REAL drives, adjust MODELED state
        # so the fly can visit search/list when curiosity is high.
        if (
            output.state == "observe_chart"
            and output.curiosity >= 0.62
            and environment.ui.search is not None
        ):
            output = output.model_copy(update={"state": "scan_assets"})

        active_inputs = sorted(
            (
                NeuronActivityModel(
                    bodyId=int(self.graph.neuron_ids[index]),
                    activity=float(activity[index]),
                )
                for index in self.graph.input_indices
                if currents[index] > 0
            ),
            key=lambda item: item.activity,
            reverse=True,
        )[:12]
        top_outputs = sorted(
            (
                NeuronActivityModel(
                    bodyId=int(self.graph.neuron_ids[index]),
                    activity=float(activity[index]),
                )
                for index in self.graph.output_indices
            ),
            key=lambda item: item.activity,
            reverse=True,
        )[:12]
        elapsed_ms = (perf_counter() - started) * 1000
        return EvaluateResponse(
            brainOutput=output,
            connectome=ConnectomeDebugModel(
                dataset="male-cns:v1.0",
                mode=mode,
                neuronCount=len(self.graph.neuron_ids),
                edgeCount=self.graph.edge_count,
                activeInputNeurons=active_inputs,
                topOutputNeurons=top_outputs,
                simulationMs=elapsed_ms,
            ),
        )
