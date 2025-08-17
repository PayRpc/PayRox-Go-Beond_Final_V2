from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, HTTPException
import httpx
from pydantic import BaseModel, Field
import pathlib
import tempfile
from typing import Any, Dict, List, Optional

# Repository and CLI runtime constants
REPO_ROOT = pathlib.Path(os.getenv('REPO_ROOT', '.')).resolve()
NODE_BIN = os.getenv('NODE_BIN', 'node')

# strict planner CLI (emits PayRox-safe JSON plan)
PLAN_JS = str(pathlib.Path(REPO_ROOT) / 'dist' / 'scripts' / 'cli' / 'plan.js')
# Manifest toolkit URL (node service)
MANIFEST_URL = os.getenv('PAYROX_MANIFEST_URL', 'http://127.0.0.1:3001')

app = FastAPI(title="PayRox Regression Generator", version="0.1.0")


class RegGenRequest(BaseModel):
    contract: str = Field(..., description="Contract name to generate harness for")
    orig: Optional[str] = Field('artifacts', description='Artifacts dir for original')
    diamond: Optional[str] = Field('artifacts', description='Artifacts dir for diamond')
    out: Optional[str] = Field(None, description='Optional output dir override')
    run_harness: Optional[bool] = Field(False, description='If true, run generated harness.js (requires addresses)')
    original_address: Optional[str] = Field(None, description='Original deployed address (required for run_harness)')
    diamond_address: Optional[str] = Field(None, description='Diamond deployed address (required for run_harness)')
    rpc_url: Optional[str] = Field(None, description='RPC url to use when running harness')


class OneClickRefactorRequest(BaseModel):
    # Minimal placeholder fields (extend later as needed)
    generateHarness: bool = False
    harnessContract: Optional[str] = None


class OneClickRefactorResponse(BaseModel):
    steps: Dict[str, Any]
    warnings: List[str] = []


class FacetOut(BaseModel):
    name: str
    selectors: List[str]
    signatures: List[str]
    notes: Optional[List[str]] = None
    codehash: Optional[str] = None
    predictedAddress: Optional[str] = None


class DiamondPlanRequest(BaseModel):
    analyzer: Dict[str, Any] = Field(..., description="Analyzer JSON blob or {contracts:[...]}" )


class DiamondPlanResponse(BaseModel):
    facets: List[FacetOut]
    init_sequence: List[str]
    loupe_coverage: List[str]
    missing_info: List[str]


def _oneclick_try_script(rel_path: str, args: List[str]):
    """Attempt to run a node script. Fallback to scripts/tools if primary path missing.

    Returns (ok, data, stderr)
    """
    node_bin = os.getenv('NODE_BIN', 'node')
    repo_root = Path(os.getenv('REPO_ROOT', '.')).resolve()
    primary = repo_root / rel_path
    fallback = None
    if 'analysis/' in rel_path:
        # derive fallback in scripts/tools/analysis
        parts = rel_path.split('analysis/')[-1]
        fallback = repo_root / 'scripts' / 'tools' / 'analysis' / parts
    script_path = primary if primary.exists() else (fallback if fallback and fallback.exists() else None)
    if not script_path:
        return False, {"error": f"script not found: {rel_path}"}, "missing"
    full_cmd = [node_bin, str(script_path)] + args
    res = run_cmd(full_cmd, cwd=repo_root, timeout=180)
    if res['rc'] != 0 and not res['stdout'].strip():
        return False, None, res['stderr']
    data = None
    try:
        data = json.loads(res['stdout'] or '{}')
    except Exception:
        data = {'raw': res['stdout']}
    return bool(data), data, res['stderr']


def _run_strict_plan(analyzer_obj: Dict[str, Any]) -> Dict[str, Any]:
    """Run the strict planner CLI and return parsed JSON plan.

    This enforces that the compiled JS CLI exists and returns machine-readable JSON.
    """
    # Ensure built planner exists
    if not pathlib.Path(PLAN_JS).exists():
        raise HTTPException(status_code=500, detail=f"Planner not found at {PLAN_JS}. Run `npm run build`.")

    # Write analyzer blob to temp file for the CLI to consume
    with tempfile.NamedTemporaryFile('w+', delete=False, suffix='.json') as tf:
        tf.write(json.dumps(analyzer_obj))
        tmp = tf.name

    # Execute CLI
    res = run_cmd([NODE_BIN, PLAN_JS, '--input', tmp], cwd=REPO_ROOT)

    # run_cmd historically returns {rc, stdout, stderr} — normalize to expected keys
    code = res.get('code', res.get('rc', None))
    stdout = res.get('stdout', '')
    stderr = res.get('stderr', '')

    if code is None:
        raise HTTPException(status_code=500, detail='planner invocation failed (no exit code)')
    if code != 0:
        raise HTTPException(status_code=500, detail=stderr or stdout or 'planner failed')

    try:
        return json.loads(stdout)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"planner returned non-JSON: {e}")


def run_cmd(cmd: List[str], cwd: Optional[Path] = None, env: Optional[Dict[str, str]] = None, timeout: int = 120) -> Dict[str, Any]:
    try:
        proc = subprocess.Popen(cmd, cwd=str(cwd) if cwd else None, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, text=True)
        out, err = proc.communicate(timeout=timeout)
        return {"rc": proc.returncode, "stdout": out, "stderr": err}
    except subprocess.TimeoutExpired:
        proc.kill()
        return {"rc": 124, "stdout": "", "stderr": "timeout"}
    except Exception as e:
        return {"rc": 1, "stdout": "", "stderr": str(e)}


@app.post('/regression/generate')
def regression_generate(body: RegGenRequest):
    """Generate a conservative regression harness using the Hardhat artifacts.

    Writes all outputs under `.payrox/generated/analysis/<ts>/harness` by default and
    never modifies repository source files.
    """
    node_bin = os.getenv('NODE_BIN', 'node')
    repo_root = Path(os.getenv('REPO_ROOT', '.')).resolve()

    args = [node_bin, str(repo_root / 'scripts' / 'analysis' / 'regression-harness-gen.js'), '--contract', body.contract]
    if body.orig:
        args += ['--orig', body.orig]
    if body.diamond:
        args += ['--diamond', body.diamond]
    if body.out:
        args += ['--out', body.out]

    res = run_cmd(args, cwd=repo_root, timeout=120)
    if res['rc'] != 0:
        raise HTTPException(status_code=500, detail={'gen_rc': res['rc'], 'stderr': res['stderr']})

    # Parse generator JSON output if present on stdout
    gen_report = None
    try:
        gen_report = json.loads(res['stdout'].strip())
    except Exception:
        # attempt to find JSON in stdout or return raw
        gen_report = {'raw_stdout': res['stdout'], 'note': 'Could not parse JSON from generator output'}

    out_dir = Path(gen_report.get('outDir') if isinstance(gen_report, dict) and gen_report.get('outDir') else (body.out or Path('.payrox') / 'generated' / 'analysis'))

    response = { 'generator': gen_report, 'runner': None }

    # Optionally run the generated harness if requested and addresses provided
    if body.run_harness:
        harness_path = out_dir
        # harness.js expected at outDir/harness.js
        harness_file = harness_path / 'harness.js'
        if not harness_file.exists():
            # try deeper discovery
            candidates = list(Path('.payrox').rglob('harness.js'))
            harness_file = Path(candidates[0]) if candidates else harness_file
        if not harness_file.exists():
            response['runner'] = {'ok': False, 'error': 'harness.js not found; generation may have failed or out dir differs', 'harness_path': str(harness_file)}
        else:
            if not (body.original_address and body.diamond_address):
                response['runner'] = {'ok': False, 'error': 'original_address and diamond_address required to run harness'}
            else:
                env = os.environ.copy()
                if body.rpc_url:
                    env['RPC_URL'] = body.rpc_url
                env['ORIGINAL_ADDRESS'] = body.original_address
                env['DIAMOND_ADDRESS'] = body.diamond_address
                run_res = run_cmd([node_bin, str(harness_file)], cwd=harness_file.parent, env=env, timeout=300)
                runner_out = None
                try:
                    runner_out = json.loads(run_res['stdout'].strip())
                except Exception:
                    runner_out = {'stdout': run_res['stdout'], 'stderr': run_res['stderr']}
                response['runner'] = {'ok': run_res['rc'] == 0, 'rc': run_res['rc'], 'report': runner_out}

    return response


@app.post('/diamond/plan', response_model=DiamondPlanResponse)
def diamond_plan(req: DiamondPlanRequest):
    """Run the strict planner (node/dist scripts) on an analyzer blob and return plan JSON.

    Non-destructive: planner is invoked as a child process and returns metadata only.
    """
    plan = _run_strict_plan(req.analyzer)
    return DiamondPlanResponse(**plan)


### Manifest toolkit proxy endpoints (for convenience)
@app.get('/manifest/health')
async def manifest_health():
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{MANIFEST_URL}/api/health", timeout=10.0)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post('/manifest/selectors')
async def manifest_selectors(body: Dict[str, Any]):
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{MANIFEST_URL}/api/selectors", json=body, timeout=20.0)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post('/manifest/chunk')
async def manifest_chunk(body: Dict[str, Any]):
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{MANIFEST_URL}/api/chunk", json=body, timeout=30.0)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post('/manifest/manifest')
async def manifest_build(body: Dict[str, Any]):
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{MANIFEST_URL}/api/manifest", json=body, timeout=30.0)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post('/manifest/proofs')
async def manifest_proofs(body: Dict[str, Any]):
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{MANIFEST_URL}/api/proofs", json=body, timeout=30.0)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post('/refactor/oneclick', response_model=OneClickRefactorResponse)
def refactor_oneclick(req: OneClickRefactorRequest):
    """Minimal one-click refactor orchestration (placeholder) with analysis glue.

    Currently only wires in internal-call rewire + event/error parity analyses.
    Non-destructive: outputs under .payrox/.
    """
    steps: Dict[str, Any] = {}
    warnings: List[str] = []

    # 5.5) Analyses: internal-call rewire & event/error parity (review-first)
    try:
        ok_rw, data_rw, err_rw = _oneclick_try_script(
            "scripts/analysis/rewire-internal-calls.js",
            ["--root", "contracts", "--out", ".payrox/generated/analysis"]
        )
        steps.setdefault("analysis", {})["internal_calls"] = {"ok": ok_rw, "data": data_rw, "stderr": err_rw}
        if not ok_rw:
            warnings.append("internal-call analysis failed")

        ok_ep, data_ep, err_ep = _oneclick_try_script(
            "scripts/analysis/event-error-parity.js",
            ["--left", "contracts/original", "--right", "contracts/ai", "--out", ".payrox/generated/analysis"]
        )
        steps["analysis"]["parity"] = {"ok": ok_ep, "data": data_ep, "stderr": err_ep}
        if not ok_ep:
            warnings.append("event/error parity analysis failed")
    except Exception as e:
        warnings.append(f"analysis integration error: {e}")

    # Use the strict planner (deterministic) to produce a PayRox-compliant plan
    try:
        # attempt to read analyzer JSON from earlier analysis step if present
        analyze_data = steps.get('analysis', {}).get('internal_calls', {}).get('data') if isinstance(steps.get('analysis', {}), dict) else {}
        strict = _run_strict_plan(analyze_data if isinstance(analyze_data, dict) else {})
        steps['plan'] = strict
    except Exception as e:
        steps['plan_error'] = str(e)
        warnings.append('strict planner failed; skipping plan stage')

    return OneClickRefactorResponse(steps=steps, warnings=warnings)
