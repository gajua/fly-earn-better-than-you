from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

DATA_DIR = Path(__file__).parents[1] / "data" / "generated"


def environment(
    *,
    momentum: float = 0.75,
    volatility: float = 0.25,
) -> dict[str, object]:
    return {
        "asset": {
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "price": 230.0,
            "changePercent": 3.4,
        },
        "position": {
            "quantity": 12,
            "averagePrice": 210.0,
            "pnlAmount": 240.0,
            "pnlPercent": 9.5,
        },
        "market": {
            "momentum": momentum,
            "volatility": volatility,
            "volumeStrength": 0.8,
        },
        "ui": {},
    }


def test_health_info_and_evaluate_use_loaded_real_artifact(
    monkeypatch,
) -> None:
    monkeypatch.setenv("MALECNS_DATA_DIR", str(DATA_DIR))
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["connectomeLoaded"] is True
        assert health.json()["dataset"] == "male-cns:v1.0"

        info = client.get("/connectome/info")
        assert info.status_code == 200
        assert info.json()["sha256"]

        response = client.post(
            "/evaluate",
            json={
                "environment": environment(),
                "mode": "real-connectome",
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert set(payload["brainOutput"]) == {
            "state",
            "buyDrive",
            "sellDrive",
            "curiosity",
            "danger",
            "activity",
        }
        assert payload["connectome"]["mode"] == "real-connectome"
        assert payload["connectome"]["activeInputNeurons"]
        assert payload["connectome"]["topOutputNeurons"]


def test_market_features_only_affect_output_through_neural_pipeline(
    monkeypatch,
) -> None:
    monkeypatch.setenv("MALECNS_DATA_DIR", str(DATA_DIR))
    with TestClient(app) as client:
        calm = client.post(
            "/evaluate",
            json={"environment": environment(volatility=0.05)},
        ).json()["brainOutput"]
        volatile = client.post(
            "/evaluate",
            json={"environment": environment(volatility=1.0)},
        ).json()["brainOutput"]
        assert calm != volatile


def test_missing_artifact_is_visible_and_never_mocked(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("MALECNS_DATA_DIR", str(tmp_path))
    with TestClient(app) as client:
        health = client.get("/health").json()
        assert health["status"] == "error"
        assert health["connectomeLoaded"] is False
        assert health["brain"] == "malecns"
        response = client.post(
            "/evaluate",
            json={"environment": environment()},
        )
        assert response.status_code == 503
        assert "MaleCNS unavailable" in response.json()["detail"]
