"""Serializable API contracts mirroring packages/core."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class RectModel(ApiModel):
    x: float
    y: float
    width: float = Field(ge=0)
    height: float = Field(ge=0)
    top: float
    right: float
    bottom: float
    left: float


class AssetModel(ApiModel):
    symbol: str = Field(min_length=1, max_length=32)
    name: str | None = Field(default=None, max_length=128)
    price: float
    changePercent: float


class PositionModel(ApiModel):
    quantity: float
    averagePrice: float
    pnlAmount: float
    pnlPercent: float


class MarketModel(ApiModel):
    momentum: float = Field(ge=-1, le=1)
    volatility: float = Field(ge=0, le=1)
    volumeStrength: float = Field(ge=0, le=1)


class UiModel(ApiModel):
    chart: RectModel | None = None
    buy: RectModel | None = None
    sell: RectModel | None = None
    portfolio: RectModel | None = None


class MarketEnvironmentModel(ApiModel):
    asset: AssetModel | None = None
    position: PositionModel | None = None
    market: MarketModel
    ui: UiModel


SimulationMode = Literal["real-connectome", "shuffled-control"]
FlyState = Literal[
    "sleep",
    "enter",
    "explore",
    "observe_chart",
    "inspect_portfolio",
    "interested",
    "approach_buy",
    "approach_sell",
    "panic",
    "leave",
]


class EvaluateRequest(ApiModel):
    environment: MarketEnvironmentModel
    mode: SimulationMode = "real-connectome"


class BrainOutputModel(ApiModel):
    state: FlyState
    buyDrive: float = Field(ge=0, le=1)
    sellDrive: float = Field(ge=0, le=1)
    curiosity: float = Field(ge=0, le=1)
    danger: float = Field(ge=0, le=1)
    activity: float = Field(ge=0, le=1)


class NeuronActivityModel(ApiModel):
    bodyId: int
    activity: float = Field(ge=0)


class ConnectomeDebugModel(ApiModel):
    dataset: Literal["male-cns:v1.0"]
    mode: SimulationMode
    neuronCount: int = Field(gt=0)
    edgeCount: int = Field(gt=0)
    activeInputNeurons: list[NeuronActivityModel]
    topOutputNeurons: list[NeuronActivityModel]
    simulationMs: float = Field(ge=0)


class EvaluateResponse(ApiModel):
    brainOutput: BrainOutputModel
    connectome: ConnectomeDebugModel
