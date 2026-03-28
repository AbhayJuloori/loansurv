import pytest
from fastapi.testclient import TestClient
import json, os

# Set env so main.py knows where to find models
os.environ.setdefault("MODEL_DIR", "models")


def test_health():
    from src.api.main import app
    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_predict_example_endpoint():
    from src.api.main import app
    client = TestClient(app)
    r = client.get("/predict/example")
    assert r.status_code == 200
    body = r.json()
    assert "grade" in body and "dti" in body


def test_predict_returns_curve():
    from src.api.main import app
    client = TestClient(app)
    example = client.get("/predict/example").json()
    r = client.post("/predict", json=example)
    assert r.status_code == 200
    body = r.json()
    assert "survival_curve" in body
    assert "default_prob_12m" in body
    assert isinstance(body["survival_curve"], list)


def test_cohort_endpoint():
    from src.api.main import app
    client = TestClient(app)
    r = client.get("/cohort/grade_A")
    assert r.status_code == 200
    body = r.json()
    assert "curve" in body


def test_model_info():
    from src.api.main import app
    client = TestClient(app)
    r = client.get("/model/info")
    assert r.status_code == 200
    body = r.json()
    assert "c_index" in body
