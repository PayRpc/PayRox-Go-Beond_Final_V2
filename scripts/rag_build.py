#!/usr/bin/env python3
"""Build the local BM25 RAG index for the PayRox-Go-Beyond contracts.

Usage:
  python scripts/rag_build.py

Creates .rag_cache/docs.json and bm25.pkl for retrieval endpoints /rag/ask.
"""
from pathlib import Path
from server import main as m

def main():
    repo_root = Path(__file__).resolve().parents[1]
    contracts_dir = repo_root / 'contracts'
    if not contracts_dir.exists():
        raise SystemExit(f"Contracts directory not found: {contracts_dir}")
    # Point server module globals at repo contracts
    m.CONTRACTS_ROOT = contracts_dir.resolve()
    # Build
    info = m.rag_build()
    print(f"Indexed {info['indexed_chunks']} chunks from {info['source_root']}")
    cache_dir = repo_root / '.rag_cache'
    if cache_dir.exists():
        print(f"Cache directory created: {cache_dir}")
        docs_json = cache_dir / 'docs.json'
        if docs_json.exists():
            print(f"docs.json size: {docs_json.stat().st_size} bytes")
    else:
        print("Cache directory not found after build.")

if __name__ == '__main__':
    main()
