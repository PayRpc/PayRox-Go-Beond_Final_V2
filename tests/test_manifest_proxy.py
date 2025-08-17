import pytest
from fastapi.testclient import TestClient
from app.main import app
import httpx


class FakeResponse:
    def __init__(self, data):
        self._data = data

    def raise_for_status(self):
        return None

    def json(self):
        return self._data


async def fake_get(self, url, timeout=10.0):
    # health endpoint
    return FakeResponse({"ok": True, "service": "payrox-manifest", "ts": "now"})


async def fake_post(self, url, json=None, timeout=20.0):
    # return a manifest-like response for /api/manifest
    if url.endswith("/api/manifest"):
        return FakeResponse({
            "routes": [],
            "merkleRoot": "0x00",
            "leaves": [],
            "version": "1.0.0",
            "timestamp": "now",
        })
    return FakeResponse({"ok": True, "body": json})


@pytest.fixture(autouse=True)
def patch_httpx(monkeypatch):
    # Patch AsyncClient methods to avoid real network calls
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    yield


def test_manifest_health():
    client = TestClient(app)
    r = client.get("/manifest/health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("ok") is True


def test_manifest_build():
    client = TestClient(app)
    body = {
        "facets": [
            {"name": "Core", "signatures": ["transfer(address,uint256)"], "predictedAddress": "0x1"}
        ]
    }
    r = client.post("/manifest/manifest", json=body)
    assert r.status_code == 200
    data = r.json()
    assert "merkleRoot" in data
