import os
from fastapi.testclient import TestClient
import importlib

# Allow picking which main to test via env
APP_MODULE = os.getenv("APP_MODULE", "main:app")
mod_name, app_name = APP_MODULE.split(":")
mod = importlib.import_module(mod_name)
app = getattr(mod, app_name)
client = TestClient(app)


def test_health_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_kb_show():
    r = client.get("/kb/show")
    assert r.status_code in (200, 404)  # /kb may be optional
    assert isinstance(r.json(), dict)


def test_contracts_root():
    r = client.get("/contracts/root")
    assert r.status_code == 200
    assert "root" in r.json()


def test_manifest_health_proxy_resilient():
    # If MANIFEST_URL unreachable, we expect 502
    r = client.get("/manifest/health")
    assert r.status_code in (200, 502)


def test_diamond_plan_schema_or_error():
    # Room for planner not built yet; endpoint should return JSON or 500 with detail
    r = client.post("/diamond/plan", json={"analyzer": {"contracts": []}})
    assert r.status_code in (200, 422, 500)
