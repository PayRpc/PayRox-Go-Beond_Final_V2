import json
import sys
from pathlib import Path
# Ensure repo root is on sys.path so `from app.main import app` works when run from scripts/
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("\n--- GET /arch/facts ---")
r = client.get("/arch/facts")
if r.status_code == 200:
	print(json.dumps(r.json(), indent=2))
else:
	print(f"ERROR: {r.status_code} {r.text}")

print("\n--- POST /arch/facts/upgrade ---")
r = client.post("/arch/facts/upgrade")
if r.status_code == 200:
	print(json.dumps(r.json(), indent=2))
else:
	print(f"ERROR: {r.status_code} {r.text}")

print("\n--- GET /arch/facts (after) ---")
r = client.get("/arch/facts")
if r.status_code == 200:
	print(json.dumps(r.json(), indent=2))
else:
	print(f"ERROR: {r.status_code} {r.text}")

print("\n--- POST /planner/diamond/plan ---")
payload = {"analyzer": {"contracts": ["placeholder"]}}
r = client.post("/planner/diamond/plan", json=payload)
if r.status_code == 200:
	print(json.dumps(r.json(), indent=2))
else:
	print(f"ERROR: {r.status_code} {r.text}")
