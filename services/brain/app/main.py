from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .connectome import DATASET, ConnectomeArtifactError, MaleCNSGraph
from .neural import MaleCNSBrain
from .schemas import EvaluateRequest, EvaluateResponse

DEFAULT_DATA_DIR = Path(__file__).parents[1] / "data" / "generated"


@asynccontextmanager
async def lifespan(app: FastAPI):
    data_dir = Path(os.getenv("MALECNS_DATA_DIR", DEFAULT_DATA_DIR))
    try:
        graph = MaleCNSGraph.load(data_dir)
        app.state.graph = graph
        app.state.brain = MaleCNSBrain(graph)
        app.state.load_error = None
    except (ConnectomeArtifactError, OSError, ValueError) as error:
        app.state.graph = None
        app.state.brain = None
        app.state.load_error = str(error)
    yield


app = FastAPI(
    title="Fly Brain Service",
    description=(
        "Real MaleCNS wiring with explicitly modeled neural dynamics and "
        "experimental market semantics."
    ),
    version="0.2.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://tauri.localhost",
        "tauri://localhost",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health(request: Request) -> dict[str, Any]:
    graph: MaleCNSGraph | None = request.app.state.graph
    return {
        "status": "ok" if graph is not None else "error",
        "brain": "malecns",
        "dataset": DATASET,
        "connectomeLoaded": graph is not None,
        "neuronCount": len(graph.neuron_ids) if graph is not None else 0,
        "edgeCount": graph.edge_count if graph is not None else 0,
        "error": request.app.state.load_error,
    }


@app.get("/connectome/info")
def connectome_info(request: Request) -> dict[str, Any]:
    graph: MaleCNSGraph | None = request.app.state.graph
    if graph is None:
        raise HTTPException(
            status_code=503,
            detail=f"MaleCNS unavailable: {request.app.state.load_error}",
        )
    return {
        **graph.provenance,
        "connectomeLoaded": True,
        "model": {
            "dynamics": "sparse LIF-like integrate-and-fire",
            "steps": 48,
            "decay": 0.86,
            "threshold": 0.58,
            "transmitterSign": "modeled from predictedNt",
            "behaviorSemantics": "experimental mapping",
        },
    }


@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate(payload: EvaluateRequest, request: Request) -> EvaluateResponse:
    brain: MaleCNSBrain | None = request.app.state.brain
    if brain is None:
        raise HTTPException(
            status_code=503,
            detail=f"MaleCNS unavailable: {request.app.state.load_error}",
        )
    return brain.evaluate(payload.environment, payload.mode)
