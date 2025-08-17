"""Simple facet splitter utility for PayRox.

Provides:
- split_facet_file(source_path) -> list of facet dicts {name, code, selectors, size}
- compute_fingerprint(obj) -> deterministic sha256 hex of normalized object
- MAX_FACET_CODE constant (EIP-170)

This is a conservative, best-effort implementation suitable for CI/workflow validation.
"""
from __future__ import annotations

import re
import json
from pathlib import Path
from typing import List, Dict
import hashlib
import subprocess
from pathlib import Path

MAX_FACET_CODE = 24576

FUNC_SIG_RE = re.compile(r"function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(public|external)")
CONTRACT_NAME_RE = re.compile(r"(contract|library|interface)\s+([A-Za-z0-9_]+)")


def _normalize_obj(obj: Dict) -> bytes:
    # sort keys recursively for deterministic fingerprint
    return json.dumps(obj, sort_keys=True, separators=(",",":"), ensure_ascii=False).encode("utf-8")


def compute_fingerprint(obj: Dict) -> str:
    return hashlib.sha256(_normalize_obj(obj)).hexdigest()


def _extract_selectors(code: str) -> List[str]:
    sigs = []
    for m in FUNC_SIG_RE.finditer(code):
        name = m.group(1)
        args = m.group(2).strip()
        sigs.append(f"{name}({args})")
    return sigs


def split_facet_file(source_path: str) -> List[Dict]:
    p = Path(source_path)
    if not p.exists():
        raise FileNotFoundError(source_path)

    # Prefer AST-based splitter via node script if available
    node_script = Path('scripts/tools/ast/split-facets.js')
    try:
        which = subprocess.run(['node', '--version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if node_script.exists() and which.returncode == 0:
            proc = subprocess.run(['node', str(node_script), str(p)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=20)
            if proc.returncode == 0 and proc.stdout:
                try:
                    data = json.loads(proc.stdout)
                    return data
                except Exception:
                    # fall through to regex fallback
                    pass
    except Exception:
        # if node isn't available or script fails, fallback to pure-python heuristic
        pass

    # Regex/line-based fallback
    text = p.read_text(encoding='utf-8', errors='ignore')
    parts = []
    last_idx = 0
    for m in CONTRACT_NAME_RE.finditer(text):
        start = m.start()
        if start > last_idx:
            part_text = text[last_idx:start]
            if part_text.strip():
                parts.append(part_text)
        last_idx = start
    final = text[last_idx:]
    if final.strip():
        parts.append(final)
    if not parts:
        parts = [text]

    out = []
    for i, code in enumerate(parts):
        name = f"facet_{i}"
        m = CONTRACT_NAME_RE.search(code)
        if m:
            name = m.group(2)
        selectors = _extract_selectors(code)
        size = len(code.encode('utf-8'))
        out.append({"name": name, "code": code, "selectors": selectors, "size": size})
    return out
