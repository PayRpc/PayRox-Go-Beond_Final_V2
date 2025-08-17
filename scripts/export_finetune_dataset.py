#!/usr/bin/env python3
"""Export repository knowledge into JSONL datasets suitable for fine-tuning.

Generates (under ./datasets):
  - raw_chunks.jsonl              : One JSON object per RAG chunk {id, source, text}
  - summarization_instructions.jsonl : Alpaca-style records {instruction,input,output}
  - function_signatures.jsonl     : Function-level context {file, signature, surrounding_code}

Usage:
  set PYTHONPATH=%CD%  (Windows PowerShell: $env:PYTHONPATH = (Get-Location).Path )
  python scripts/export_finetune_dataset.py

Notes:
  - This script does NOT call any model; 'output' fields are left blank for
    human / later model fill-in.
  - Adjust MAX_CHUNK_CHARS to cap record size for models with smaller context windows.
"""
from __future__ import annotations
import json, re
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / '.rag_cache'
DATASETS_DIR = ROOT / 'datasets'
DATASETS_DIR.mkdir(exist_ok=True)

DOCS_JSON = CACHE_DIR / 'docs.json'

MAX_CHUNK_CHARS = 1800  # keep examples compact

FUNC_RE = re.compile(r"function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)[^{;]*?{", re.MULTILINE)


def iter_sol_files() -> Iterable[Path]:
    for p in (ROOT / 'contracts').rglob('*.sol'):
        if p.is_file():
            yield p


def export_raw_chunks(chunks):
    out_path = DATASETS_DIR / 'raw_chunks.jsonl'
    with out_path.open('w', encoding='utf-8') as f:
        for ch in chunks:
            text = ch['text'][:MAX_CHUNK_CHARS]
            f.write(json.dumps({"id": ch['id'], "source": ch['source'], "text": text}, ensure_ascii=False) + '\n')
    return out_path


def export_summarization(chunks):
    out_path = DATASETS_DIR / 'summarization_instructions.jsonl'
    with out_path.open('w', encoding='utf-8') as f:
        for ch in chunks:
            record = {
                "instruction": "Summarize the following Solidity contract fragment succinctly.",
                "input": ch['text'][:MAX_CHUNK_CHARS],
                "output": ""  # to be filled (ground truth summary)
            }
            f.write(json.dumps(record, ensure_ascii=False) + '\n')
    return out_path


def grab_surrounding(lines, start_idx, radius=12):
    lo = max(0, start_idx - radius)
    hi = min(len(lines), start_idx + radius)
    return '\n'.join(lines[lo:hi])


def export_function_signatures():
    out_path = DATASETS_DIR / 'function_signatures.jsonl'
    with out_path.open('w', encoding='utf-8') as f:
        for sol in iter_sol_files():
            try:
                text = sol.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            lines = text.splitlines()
            for m in FUNC_RE.finditer(text):
                sig_full = m.group(0).split('{',1)[0].strip()
                # line number heuristic
                char_pos = m.start()
                line_idx = text[:char_pos].count('\n')
                surrounding = grab_surrounding(lines, line_idx)
                rec = {
                    "file": str(sol.relative_to(ROOT)),
                    "signature": sig_full,
                    "surrounding_code": surrounding[:MAX_CHUNK_CHARS],
                    "instruction": "Explain the purpose of this Solidity function.",
                    "output": ""  # to be filled with explanation
                }
                f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    return out_path


def main():
    if not DOCS_JSON.exists():
        raise SystemExit("RAG docs.json not found. Run scripts/rag_build.py first.")
    chunks = json.loads(DOCS_JSON.read_text(encoding='utf-8'))
    raw_path = export_raw_chunks(chunks)
    sum_path = export_summarization(chunks)
    func_path = export_function_signatures()
    print("Export complete:")
    print(" -", raw_path)
    print(" -", sum_path)
    print(" -", func_path)


if __name__ == '__main__':
    main()
