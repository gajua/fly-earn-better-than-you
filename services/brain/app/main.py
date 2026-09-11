from fastapi import FastAPI

app = FastAPI(
    title="Fly Brain Service",
    description=(
        "MaleCNS integration boundary. M0-M3 contains no biological simulation."
    ),
    version="0.1.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    """Return process health without touching neuPrint or credentials."""
    return {
        "status": "ok",
        "brain": "mock-client-only",
        "connectome": "not-loaded",
    }
