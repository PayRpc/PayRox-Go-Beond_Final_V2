"""Run manifest proxy smoke tests without pytest.

This script patches httpx.AsyncClient.get/post to avoid network calls and
exercises the FastAPI endpoints added in `app/main.py`.
"""
import sys
from pathlib import Path
import httpx
from fastapi.testclient import TestClient

# Ensure repository root is on sys.path so `app` package is importable
repo_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(repo_root))

from app.main import app


class FakeResponse:
    def __init__(self, data):
        self._data = data

    def raise_for_status(self):
        return None

    def json(self):
        return self._data


async def fake_get(self, url, timeout=10.0):
    return FakeResponse({"ok": True, "service": "payrox-manifest", "ts": "now"})


async def fake_post(self, url, json=None, timeout=20.0):
    if url.endswith("/api/manifest"):
        return FakeResponse({
            "routes": [],
            "merkleRoot": "0x00",
            "leaves": [],
            "version": "1.0.0",
            "timestamp": "now",
        })
    return FakeResponse({"ok": True, "body": json})


def patch_httpx():
    # Bind the async functions to httpx.AsyncClient
    httpx.AsyncClient.get = fake_get
    httpx.AsyncClient.post = fake_post


def run_tests():
    patch_httpx()
    client = TestClient(app)

    # health
    r = client.get('/manifest/health')
    if r.status_code != 200:
        print('FAIL: /manifest/health status', r.status_code, r.text)
        return 2
    data = r.json()
    if not data.get('ok'):
        print('FAIL: /manifest/health body', data)
        return 2

    # manifest build
    body = {
        'facets': [
            {'name': 'Core', 'signatures': ['transfer(address,uint256)'], 'predictedAddress': '0x1'}
        ]
    }
    r = client.post('/manifest/manifest', json=body)
    if r.status_code != 200:
        print('FAIL: /manifest/manifest status', r.status_code, r.text)
        return 2
    data = r.json()
    if 'merkleRoot' not in data:
        print('FAIL: /manifest/manifest missing merkleRoot', data)
        return 2

    print('PASS: manifest proxy smoke tests')
    return 0


if __name__ == '__main__':
    rc = run_tests()
    sys.exit(rc)
