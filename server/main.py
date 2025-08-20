from __future__ import annotations

import os
import json
import pickle
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
import subprocess

from fastapi import FastAPI, HTTPException, Query, Body
from pydantic import BaseModel, Field
from rank_bm25 import BM25Okapi
from ollama import Client

# -----------------------------------------------------------------------------
# App
# -----------------------------------------------------------------------------
app = FastAPI(
    title="Contracts RAG",
    version="1.3.0",
    openapi_version="3.1.0",
    openapi_url="/openapi.json",
)

# Optional CORS (safe localhost defaults)
try:
    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1",
            "http://localhost",
            "http://127.0.0.1:3000",
            "http://localhost:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
except Exception:
    # If CORS isn't available, continue without it (fine for server-side use)
    pass


# ---- RAG/LLM notes (docs) ------------------------------------
# default k=8 (tunable via `k` query param)
# ~4k token context window (model-dependent)

# Solidity chunking
FUNC_SPLIT = re.compile(r"(?=^\s*(contract|library|interface|function|event|struct|modifier)\b)", re.M)


def chunk_text(text: str, size: int = 1500, overlap: int = 150) -> List[str]:
    out: List[str] = []
    step = max(1, size - overlap)
    text_len = len(text)
    for i in range(0, text_len, step):
        out.append(text[i : i + size])
        if i + size >= text_len:
            break
    return out


# -----------------------------------------------------------------------------
# Globals / helpers (minimal defaults so module imports cleanly)
# -----------------------------------------------------------------------------
CONTRACTS_ROOT = Path(os.getenv('PRX_CONTRACTS_ROOT', 'contracts')).resolve()
ARCH_DIR = Path(os.getenv('PRX_ARCH_DIR', str(Path(CONTRACTS_ROOT) / 'arch'))).resolve()
FACTS_PATH = ARCH_DIR / 'facts.json'

# Environment & pinned context config (PayRox-aware defaults)
# OLLAMA_HOST may be provided via OLLAMA_HOST or PRX_OLLAMA_HOST. Do not overwrite if already set.
OLLAMA_HOST = os.getenv('PRX_OLLAMA_HOST', os.getenv('OLLAMA_HOST', 'http://127.0.0.1:11434'))
if 'OLLAMA_HOST' not in os.environ:
    os.environ['OLLAMA_HOST'] = OLLAMA_HOST

# Optional pinned facts file (always visible to the analyzer/RAG)
PRX_PINNED_FILE = Path(os.getenv('PRX_PINNED', '.payrox/pinned-go-beyond.md'))

SCRIPTS_ROOT_ENV = os.getenv('PRX_SCRIPTS_ROOT')
SCRIPTS_ROOT = Path(SCRIPTS_ROOT_ENV).resolve() if SCRIPTS_ROOT_ENV else None

INDEX_DIR = Path('.rag_cache')
INDEX_DIR.mkdir(exist_ok=True)
DOCS_JSON = INDEX_DIR / 'docs.json'
BM25_PKL = INDEX_DIR / 'bm25.pkl'

BM25 = None
DOCS: List[Dict[str, Any]] = []

NETWORK = os.getenv('PRX_NETWORK', 'localhost')


class EchoIn(BaseModel):
    text: str

class TransformApplyRequest(BaseModel):
    file: str = Field(..., description="Path to .sol file relative to CONTRACTS_ROOT")
    contract: Optional[str] = Field(None, description="Contract name (optional)")
    save_to: Optional[str] = Field(None, description="Output subdir under .payrox/generated (optional)")


class TransformApplyResponse(BaseModel):
    out_file: Optional[str]
    patch_file: Optional[str]
    report: Optional[Dict[str, Any]] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None

# Regression harness generation models
class RegressionGenRequest(BaseModel):
    contract: str = Field(..., description="Contract name to probe (e.g., Test)")
    origArtifactsDir: Optional[str] = Field("artifacts", description="Original artifacts dir")
    diamondArtifactsDir: Optional[str] = Field("artifacts", description="Diamond artifacts dir")
    outDir: Optional[str] = Field(None, description="Output dir; defaults to .payrox/generated/analysis/<ts>/harness")


class RegressionGenResponse(BaseModel):
    ok: bool
    outDir: Optional[str] = None
    files: List[str] = []
    warnings: List[str] = []
    stderr: Optional[str] = None
# Node binary and repo root defaults (safe, overridable via env)
NODE_BIN = os.getenv('NODE_BIN', 'node')
REPO_ROOT = Path(os.getenv('REPO_ROOT', '.')).resolve()


def tokenize(s: str) -> List[str]:
    return [tok for tok in re.findall(r"\w+", s.lower())]


def split_solidity(text: str) -> List[str]:
    # Split on common Solidity tokens, fallback to chunk_text
    parts = [p.strip() for p in FUNC_SPLIT.split(text) if p and p.strip()]
    if not parts:
        return chunk_text(text)
    out: List[str] = []
    for p in parts:
        for c in chunk_text(p, size=1500, overlap=150):
            out.append(c)
    return out


def _load_pinned_context() -> str:
    try:
        # Prefer PRX_PINNED_FILE, then ARCH facts.json as a fallback
        if PRX_PINNED_FILE and PRX_PINNED_FILE.exists():
            return PRX_PINNED_FILE.read_text(encoding='utf-8')
        if FACTS_PATH.exists():
            return FACTS_PATH.read_text(encoding='utf-8')
    except Exception:
        pass
    return ""


def _scan_scripts_docs() -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not SCRIPTS_ROOT:
        return out
    exts = {'.ts', '.js', '.json', '.md'}
    for p in SCRIPTS_ROOT.rglob('*'):
        try:
            if p.suffix.lower() in exts and p.is_file():
                text = p.read_text(encoding='utf-8', errors='ignore')
                rel = str(p.relative_to(SCRIPTS_ROOT))
                out.append({'id': rel, 'text': text[:8000], 'source': rel})
        except Exception:
            continue
    return out


def _safe_path(p: str) -> Path:
    candidate = (CONTRACTS_ROOT / p).resolve()
    if not str(candidate).startswith(str(CONTRACTS_ROOT)):
        raise HTTPException(status_code=400, detail='Invalid path')
    return candidate


def _read_text_safely(p: Path) -> str:
    try:
        return p.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        raise HTTPException(status_code=404, detail=f'File not found: {p}')


def _retrieve(query: str, k: int = 6) -> List[Dict[str, Any]]:
    global BM25, DOCS
    if BM25 is None or not DOCS:
        if not _load_index_if_present():
            raise HTTPException(status_code=400, detail="Index not built. POST /rag/build first.")
    scores = BM25.get_scores(tokenize(query))
    top = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k]
    return [DOCS[i] | {"score": float(scores[i])} for i in top]


def _payrox_bucket_for_file(file_path: str) -> str:
    """Lightweight heuristic: map file path to a small bucket used as a hint.

    Buckets: core, administrative, liquidity, rewards, misc
    """
    p = file_path.lower()
    if 'liquid' in p or 'liquidity' in p:
        return 'liquidity'
    if 'reward' in p or 'distrib' in p:
        return 'rewards'
    if 'admin' in p or 'govern' in p:
        return 'administrative'
    if 'core' in p or 'impl' in p:
        return 'core'
    return 'misc'


def _load_index_if_present() -> bool:
    """Try to lazily load a persisted DOCS/BM25 index from disk.

    Returns True if loaded, False otherwise.
    """
    global BM25, DOCS
    try:
        if DOCS_JSON.exists() and BM25_PKL.exists():
            DOCS = json.loads(DOCS_JSON.read_text(encoding="utf-8"))
            with open(BM25_PKL, "rb") as f:
                BM25 = pickle.load(f)
            return True
    except Exception:
        pass
    return False


def run_cmd(cmd: List[str], cwd: Optional[Path] = None, timeout: int = 60) -> Tuple[int, str, str]:
    """Run a subprocess command and capture output. Returns (rc, stdout, stderr)."""
    try:
        proc = subprocess.Popen(
            cmd,
            cwd=str(cwd) if cwd else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=False,
            text=True,
        )
        out, err = proc.communicate(timeout=timeout)
        return proc.returncode or 0, (out or ""), (err or "")
    except subprocess.TimeoutExpired:
        proc.kill()
        return 124, "", "timeout"
    except Exception as exc:
        return 1, "", str(exc)


@app.post("/transform/apply", response_model=TransformApplyResponse)
def transform_apply(body: TransformApplyRequest):
    """Run the conservative POC transformer and return produced artifacts.

    Safety: never overwrite sources. Outputs are written under .payrox/generated/transformers.
    """
    rel_path = Path(body.file)
    abs_path = (CONTRACTS_ROOT / rel_path).resolve()
    if not str(abs_path).startswith(str(CONTRACTS_ROOT)):
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not abs_path.exists():
        raise HTTPException(status_code=404, detail=f"Source not found: {abs_path}")

    out_dir = Path('.payrox') / 'generated' / 'transformers'
    if body.save_to:
        out_dir = out_dir / body.save_to
    out_dir.mkdir(parents=True, exist_ok=True)

    # Build command
    script = Path('scripts') / 'transformers' / 'transform-one.js'
    if not script.exists():
        raise HTTPException(status_code=500, detail=f"Transformer script missing: {script}")

    cmd = [NODE_BIN, str(script.resolve()), '--file', str(abs_path),]
    if body.contract:
        cmd += ['--contract', body.contract]

    rc, out, err = run_cmd(cmd, cwd=REPO_ROOT, timeout=120)

    # The transformer writes files under .payrox/generated/transformers/<ts>/applied/
    # Try to discover the most recent out/patch files in out_dir
    out_file = None
    patch_file = None
    try:
        candidates = list(out_dir.rglob('applied/*'))
        candidates = [p for p in candidates if p.is_file()]
        if candidates:
            # newest by mtime
            candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            # pick first *.out or *.sol as out_file and *.patch as patch_file heuristics
            for p in candidates:
                if p.suffix == '.patch' and not patch_file:
                    patch_file = str(p)
                if p.suffix in {'.sol', '.txt', '.out'} and not out_file:
                    out_file = str(p)
    except Exception:
        pass

    resp = TransformApplyResponse(out_file=out_file, patch_file=patch_file, stdout=out, stderr=err)
    if rc != 0:
        raise HTTPException(status_code=500, detail={"rc": rc, "stdout": out, "stderr": err})
    return resp


@app.post("/regression/generate", response_model=RegressionGenResponse)
def regression_generate(req: RegressionGenRequest):
    """Generate a regression harness comparing zero-arg view/pure functions.

    Non-destructive: writes under .payrox/generated/analysis/<ts>/harness.
    """
    script = str(Path(REPO_ROOT) / "scripts" / "analysis" / "regression-harness-gen.js")
    if not Path(script).exists():
        raise HTTPException(status_code=500, detail=f"Generator not found at {script}")
    args = [NODE_BIN, script, "--contract", req.contract, "--orig", req.origArtifactsDir or "artifacts", "--diamond", req.diamondArtifactsDir or "artifacts"]
    if req.outDir:
        args += ["--out", req.outDir]
    rc, out, err = run_cmd(args, cwd=REPO_ROOT, timeout=180)
    if rc != 0 and not out.strip():
        return RegressionGenResponse(ok=False, stderr=err or None)
    try:
        data = json.loads(out or "{}")
        return RegressionGenResponse(
            ok=bool(data.get("ok", False)),
            outDir=data.get("outDir"),
            files=data.get("files", []),
            warnings=data.get("warnings", []),
            stderr=err or None,
        )
    except Exception:
        return RegressionGenResponse(ok=True, outDir=None, files=[], warnings=[], stderr=err or None)


# -----------------------------------------------------------------------------
# Diagnostics / KB
# -----------------------------------------------------------------------------
@app.get("/health")
def health():
    # Everything wrapped to avoid 500s from optional pieces
    try:
        contracts_root_str = str(CONTRACTS_ROOT)
    except Exception:
        contracts_root_str = ""

    try:
        arch_dir_str = str(ARCH_DIR)
    except Exception:
        arch_dir_str = ""

    # SCRIPTS_ROOT may be optional; don’t assume it exists as a Path
    try:
        scripts_root_str = SCRIPTS_ROOT_ENV if 'SCRIPTS_ROOT_ENV' in globals() and SCRIPTS_ROOT_ENV else ""
    except Exception:
        scripts_root_str = ""

    try:
        indexed_flag = (BM25 is not None) and bool(DOCS)
        doc_chunks = len(DOCS) if DOCS else 0
    except Exception:
        indexed_flag = False
        doc_chunks = 0

    try:
        pinned_len = len(PINNED_CONTEXT or "")
    except Exception:
        pinned_len = 0

    return {
        "status": "ok",
        "contracts_root": contracts_root_str,
        "arch_dir": arch_dir_str,
        "pinned_bytes": pinned_len,
        "indexed": indexed_flag,
        "doc_chunks": doc_chunks,
        "scripts_root": scripts_root_str,
    }


@app.post("/kb/reload")
def kb_reload() -> dict:
    global PINNED_CONTEXT
    PINNED_CONTEXT = _load_pinned_context()
    return {"loaded": bool(PINNED_CONTEXT), "bytes": len(PINNED_CONTEXT.encode("utf-8")) if PINNED_CONTEXT else 0}

# --- add this helper anywhere near the other endpoints ---
@app.get("/kb/show")
def kb_show():
    """Inspect the currently loaded pinned KB (size + preview)."""
    try:
        preview = PINNED_CONTEXT[:600]
    except Exception:
        preview = ""
    return {
        "bytes": len(PINNED_CONTEXT.encode("utf-8")) if PINNED_CONTEXT else 0,
        "preview": preview,
    }


# Admin endpoints for runtime maintenance
@app.get("/admin/root")
def admin_get_root():
    return {"contracts_root": str(CONTRACTS_ROOT)}


@app.post("/admin/set-root")
def admin_set_root(new_root: str = Body(..., embed=True)):
    global CONTRACTS_ROOT, BM25, DOCS
    p = Path(new_root).resolve()
    if not p.exists() or not p.is_dir():
        raise HTTPException(status_code=400, detail=f"Path not found: {p}")
    CONTRACTS_ROOT = p
    # reset in-memory index so users remember to rebuild
    BM25, DOCS = None, []
    return {"contracts_root": str(CONTRACTS_ROOT), "indexed": False}


# -----------------------------------------------------------------------------
# Basic file endpoints
# -----------------------------------------------------------------------------
@app.post("/echo")
def echo(body: EchoIn):
    return {"echo": body.text}


@app.get("/contracts/root")
def show_root():
    return {"root": str(CONTRACTS_ROOT)}


@app.get("/contracts/list")
def list_contracts(
    ext: str = Query(".sol", description="File extension to include (e.g. .sol)"),
    limit: int = Query(200, ge=1, le=5000),
):
    ext = ext if ext.startswith(".") else f".{ext}"
    files: List[dict] = []
    for p in CONTRACTS_ROOT.rglob(f"*{ext}"):
        try:
            stat = p.stat()
            files.append(
                {
                    "path": str(p.relative_to(CONTRACTS_ROOT)),
                    "size": stat.st_size,
                    "modified": int(stat.st_mtime),
                }
            )
            if len(files) >= limit:
                break
        except Exception:
            continue
    files.sort(key=lambda x: x["path"])
    return {"root": str(CONTRACTS_ROOT), "count": len(files), "results": files}


@app.get("/contracts/search")
def search_contracts(
    q: str = Query(..., min_length=1),
    limit: int = Query(100, ge=1, le=1000),
):
    hits: List[dict] = []
    ql = q.lower()
    for p in CONTRACTS_ROOT.rglob("*.sol"):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        tl = text.lower()
        if ql in tl:
            i = tl.index(ql)
            snippet = text[max(0, i - 80) : i + 80].replace("\n", " ")
            hits.append({"file": str(p.relative_to(CONTRACTS_ROOT)), "snippet": snippet})
            if len(hits) >= limit:
                break
    return {"root": str(CONTRACTS_ROOT), "query": q, "count": len(hits), "results": hits}


@app.get("/contracts/search-index")
def search_index(q: str = Query(..., min_length=2), k: int = Query(20, ge=1, le=100)):
    hits = _retrieve(q, k=k)
    return {
        "query": q,
        "count": len(hits),
        "results": [
            {"source": h["source"], "score": h["score"], "preview": h["text"][:280]}
            for h in hits
        ],
    }


@app.get("/contracts/read")
def read_contract(path: str = Query(...)):
    abs_path = _safe_path(path)
    text = _read_text_safely(abs_path)
    return {
        "root": str(CONTRACTS_ROOT),
        "file": str(abs_path.relative_to(CONTRACTS_ROOT)),
        "size": len(text.encode("utf-8")),
        "content": text,
    }


# Simple selector extractor (regex; fast)
SIG_RE = re.compile(r'function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(external|public)')


@app.get("/contracts/selectors")
def list_selectors(limit_files: int = 200):
    results = []
    scanned = 0
    for p in CONTRACTS_ROOT.rglob("*.sol"):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        sigs = []
        for m in SIG_RE.finditer(text):
            name = m.group(1)
            args = m.group(2).strip()
            sigs.append({"name": name, "args": args})
        if sigs:
            results.append({"file": str(p.relative_to(CONTRACTS_ROOT)), "functions": sigs})
        scanned += 1
        if scanned >= limit_files:
            break
    return {"count_files_scanned": scanned, "results": results}


# -----------------------------------------------------------------------------
# Compatibility shim expected by some UIs
# -----------------------------------------------------------------------------
@app.post("/api/analyze")
def api_analyze(body: dict):
    """Accepts { prompt, model?, max_tokens? } and returns {"model","response","raw"}."""
    prompt = body.get("prompt") or body.get("query") or body.get("q")
    if not prompt:
        raise HTTPException(status_code=400, detail="Missing 'prompt' in request body.")
    model = body.get("model", "codellama:7b")
    max_tokens = int(body.get("max_tokens", 256))
    client = Client()
    try:
        resp = client.generate(model=model, prompt=prompt, options={"num_predict": max_tokens})
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI backend error: {exc}")
    return {"model": model, "response": resp.get("response", ""), "raw": resp}

# -----------------------------------------------------------------------------
# RAG (build + ask)
# -----------------------------------------------------------------------------
@app.post("/rag/build")
def rag_build() -> dict:
    """Scan contracts folder in parallel, chunk, tokenize, and build a BM25 index."""
    global BM25, DOCS
    DOCS = []

    files = [p for p in CONTRACTS_ROOT.rglob("*.sol")]

    def read_and_chunk(p: Path):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
            rel = str(p.relative_to(CONTRACTS_ROOT))
            out = []
            for i, chunk in enumerate(split_solidity(text)):
                out.append({"id": f"{rel}#{i}", "text": chunk, "source": rel})
            return out
        except Exception:
            return []

    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = [ex.submit(read_and_chunk, p) for p in files]
        for fut in as_completed(futures):
            try:
                DOCS.extend(fut.result())
            except Exception:
                continue

    # Backwards-compatible: if SCRIPTS_ROOT was set earlier, include scripts/docs
    if SCRIPTS_ROOT:
        try:
            DOCS.extend(_scan_scripts_docs())
        except Exception:
            pass

    if not DOCS:
        raise HTTPException(status_code=404, detail="No .sol files found to index.")

    token_lists = [tokenize(d["text"]) for d in DOCS]
    BM25 = BM25Okapi(token_lists)
    DOCS_JSON.write_text(json.dumps(DOCS, ensure_ascii=False), encoding="utf-8")
    with open(BM25_PKL, "wb") as f:
        pickle.dump(BM25, f)
    return {"indexed_chunks": len(DOCS), "source_root": str(CONTRACTS_ROOT)}


@app.post("/rag/build_all")
def rag_build_all() -> dict:
    """Build index from contracts (*.sol) + scripts (ts/js/json/md if PRX_SCRIPTS_ROOT set)."""
    global BM25, DOCS
    DOCS = []
    # Contracts
    for p in CONTRACTS_ROOT.rglob("*.sol"):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        rel = str(p.relative_to(CONTRACTS_ROOT))
        for i, chunk in enumerate(split_solidity(text)):
            DOCS.append({"id": f"{rel}#{i}", "text": chunk, "source": rel})
    # Scripts
    DOCS.extend(_scan_scripts_docs())

    if not DOCS:
        raise HTTPException(status_code=404, detail="No source files found to index.")

    token_lists = [tokenize(d["text"]) for d in DOCS]
    BM25 = BM25Okapi(token_lists)

    DOCS_JSON.write_text(json.dumps(DOCS, ensure_ascii=False), encoding="utf-8")
    with open(BM25_PKL, "wb") as f:
        pickle.dump(BM25, f)

    return {
        "indexed_chunks": len(DOCS),
        "source_root": str(CONTRACTS_ROOT),
        "scripts_root": (str(SCRIPTS_ROOT) if SCRIPTS_ROOT else None),
    }


@app.get("/diag/ollama")
def diag_ollama():
    try:
        client = Client()  # uses OLLAMA_HOST or defaults to localhost:11434
        listing = client.list()  # {'models': [...]} or similar
        models = [m.get("name") or m.get("model") for m in listing.get("models", [])]
        return {"ok": True, "models": models}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Cannot reach Ollama: {exc}")


@app.get("/rag/ask")
def rag_ask(
    q: str = Query(..., min_length=3, description="Your question (no commands/URLs)"),
    model: str = Query("codellama:7b", description="Ollama model name"),
    k: int = Query(8, ge=1, le=12),
):
    if re.search(r"(curl|http(s)?://|cmd\s*/c)", q, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="Pass only the question text in 'q' (no commands/URLs).")

    hits = _retrieve(q, k=k)
    context = "\n\n---\n".join(f"[{h['source']}] {h['text']}" for h in hits)

    # add pinned facts and light bucket hints
    pinned = _load_pinned_context()
    bucket_hints = []
    for h in hits:
        bucket_hints.append(f"{h['source']}->{_payrox_bucket_for_file(h['source'])}")

    prompt = (
        "You are an expert Solidity assistant. Answer ONLY from the context. "
        "If it's not in the context, say you don't know.\n\n"
        f"PinnedFacts:\n{pinned}\n\n"
        f"Question:\n{q}\n\nContext:\n{context}\n\n"
        f"BucketHints:\n{', '.join(bucket_hints)}\n\nAnswer:"
    )

    try:
        client = Client()
        resp = client.generate(model=model, prompt=prompt, stream=False)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Ollama error: {exc}")

    return {
        "model": model,
        "answer": resp.get("response", ""),
        "used_chunks": [{"source": h["source"], "score": h["score"]} for h in hits],
    }


@app.get("/rag/ask-with-context")
def rag_ask_with_context(
    q: str = Query(..., min_length=3),
    model: str = Query("codellama:7b"),
    k: int = Query(8, ge=1, le=12),
):
    hits = _retrieve(q, k=k)
    context = "\n\n---\n".join(f"[{h['source']}] {h['text']}" for h in hits)
    pinned = _load_pinned_context()
    prompt = (
        "Answer ONLY from the context. If missing, say you don't know.\n\n"
        f"PinnedFacts:\n{pinned}\n\n"
        f"Question:\n{q}\n\nContext:\n{context}\n\nAnswer:"
    )
    try:
        client = Client()
        resp = client.generate(model=model, prompt=prompt, stream=False)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Ollama error: {exc}")

    return {
        "model": model,
        "answer": resp.get("response", ""),
        "used_chunks": [{"source": h["source"], "score": h["score"]} for h in hits],
        "context": context,
    }


# -----------------------------------------------------------------------------
# Diamond plan (JSON, CPU-friendly)
# -----------------------------------------------------------------------------
@app.get("/diamond/plan")
def diamond_plan(
    q: str = Query("Propose a Diamond manifest from the codebase"),
    model: str = Query("codellama:7b-instruct"),
    k: int = Query(4, ge=1, le=12),
):
    """
    Propose a Diamond (EIP-2535) facet plan as strict JSON.

    This endpoint collects retrieved code chunks, includes any pinned facts and a
    precomputed dispatcher hint (from arch/facts.json) and asks the model to
    return STRICT JSON matching the schema. If the model output isn't valid
    JSON, _json_or_repair will attempt one repair pass.
    """
    hits = _retrieve(q, k=k)
    retrieved = "\n\n---\n".join(f"[{h['source']}] {h['text']}" for h in hits)

    # precompute dispatcher hint from facts.json (if present)
    dispatcher_hint = ""
    try:
        if FACTS_PATH.exists():
            facts_obj = json.loads(FACTS_PATH.read_text(encoding="utf-8"))
            disp_map = facts_obj.get("dispatcher_addresses") or facts_obj.get("dispatcher", {}).get("mapping") or {}
            if isinstance(disp_map, dict):
                dispatcher_hint = disp_map.get(NETWORK, "") or ""
    except Exception:
        pass

    context_parts = []
    pinned = _load_pinned_context()
    if pinned:
        context_parts.append("PINNED FACTS:\n" + pinned)
    if dispatcher_hint:
        context_parts.append(f"NETWORK HINT: {NETWORK} | DISPATCHER: {dispatcher_hint}")
    context_parts.append("RETRIEVED CODE CHUNKS:\n" + retrieved)
    context = "\n\n".join(context_parts)

    schema = {
        "type": "object",
        "properties": {
            "facets": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "selectors": {"type": "array", "items": {"type": "string"}},
                        "notes": {"type": "string"},
                    },
                    "required": ["name", "selectors"],
                },
            },
            "init_sequence": {"type": "array", "items": {"type": "string"}},
            "loupe_coverage": {"type": "array", "items": {"type": "string"}},
            "expected_hashes": {
                "type": "object",
                "properties": {"manifest": {"type": "string"}, "factory_bytecode": {"type": "string"}},
            },
            "deployment": {
                "type": "object",
                "properties": {"factory_address": {"type": "string"}, "salts": {"type": "object"}},
            },
            "merkle": {"type": "object", "properties": {"leaf_encoding": {"type": "string"}, "notes": {"type": "string"}}},
            "epoch_guard": {
                "type": "object",
                "properties": {"network": {"type": "string"}, "dispatcher_address": {"type": "string"}, "checks": {"type": "array"}},
            },
            "missing_info": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["facets"],
    }
    schema_txt = json.dumps(schema)

    prompt = f"""
You are a precise refactor assistant. Output STRICT JSON ONLY (no prose).

CONTEXT:
{context}

TASK:
Return an object that matches this schema exactly:
{schema_txt}

Guidelines:
- Group selectors into logical facets; preserve ABI (no behavior change).
- If a dispatcher address is known for the current network, set epoch_guard.network and epoch_guard.dispatcher_address.
- If unknown, add a concrete next step in 'missing_info' (e.g., "add dispatcher for {NETWORK} to facts.json").
- Set merkle.leaf_encoding to "keccak256(abi.encode(bytes4,address,bytes32))".
- Use pinned facts for expected_hashes if present; otherwise add 'missing_info'.
"""

    client = Client()
    resp = client.generate(
        model=model,
        prompt=prompt,
        format="json",
        options={"temperature": 0.1, "num_ctx": 2048, "num_predict": 800},
    )
    text = resp.get("response", "").strip()

    try:
        plan = _json_or_repair(client, model, text, schema_txt)
        return {"plan": plan, "used_chunks": [{"source": h["source"], "score": h["score"]} for h in hits]}
    except Exception as e:
        return {"raw": text, "error": f"JSON parse failed: {e}", "used_chunks": [{"source": h["source"], "score": h["score"]} for h in hits]}


def _json_or_repair(client: Client, model: str, raw_text: str, schema_txt: str) -> Any:
    """Try to parse JSON, else ask model to repair once and parse.

    This is intentionally simple: one parse attempt, then one repair attempt via the model.
    """
    try:
        return json.loads(raw_text)
    except Exception:
        # Ask model to output valid JSON only
        repair_prompt = f"The following output should be valid JSON matching this schema:\n{schema_txt}\n\nInvalid output:\n{raw_text}\n\nPlease output only valid JSON." 
        resp = client.generate(model=model, prompt=repair_prompt, options={"temperature": 0.0, "num_predict": 512})
        repaired = resp.get("response", "").strip()
        return json.loads(repaired)


# -----------------------------------------------------------------------------
# Entrypoint (optional)
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    # Note: transform endpoint uses NODE_BIN and expects scripts/transformers/transform-one.js
