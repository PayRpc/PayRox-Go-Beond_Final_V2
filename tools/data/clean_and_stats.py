"""Clean JSONL dataset and produce token-length stats.

Usage:
  python tools/data/clean_and_stats.py --input datasets/combined_instructions.jsonl \
      --out datasets/combined_clean.jsonl --report datasets/token_stats.json

Features:
- Drops records with ultra-short 'input' or 'instruction' (configurable min_tokens or min_chars).
- Removes exact duplicate input+instruction pairs.
- Computes token length histogram using tiktoken if installed, otherwise char-based heuristic.
"""
from __future__ import annotations
import argparse
import json
import hashlib
from pathlib import Path
from typing import Dict, Any, Tuple

try:
    import tiktoken
    TOKENIZER_AVAILABLE = True
except Exception:
    TOKENIZER_AVAILABLE = False


def load_jsonl(path: Path):
    with path.open('r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except Exception:
                continue


def hash_rec(rec: Dict[str, Any]) -> str:
    s = (rec.get('instruction','') + '\n' + rec.get('input','') + '\n' + rec.get('output','')).encode('utf-8')
    return hashlib.sha256(s).hexdigest()


def count_tokens(text: str, model: str='gpt-3.5-turbo') -> int:
    if TOKENIZER_AVAILABLE:
        enc = tiktoken.encoding_for_model(model)
        return len(enc.encode(text))
    # fallback heuristic: 1 token ~ 4 chars
    return max(1, len(text) // 4)


def clean_and_stats(input_path: Path, out_path: Path, report_path: Path, min_tokens: int = 6, seed: int = 42):
    seen = set()
    cleaned = []
    stats = {'total': 0, 'kept': 0, 'duplicates': 0, 'too_short': 0, 'token_buckets': {}}
    buckets = [(0,32),(33,64),(65,128),(129,256),(257,512),(513,999999)]

    for rec in load_jsonl(input_path):
        stats['total'] += 1
        inp = rec.get('input','') or ''
        instr = rec.get('instruction','') or ''
        if not inp.strip() and not instr.strip():
            stats['too_short'] += 1
            continue
        key = hash_rec(rec)
        if key in seen:
            stats['duplicates'] += 1
            continue
        seen.add(key)

        # token length check
        tok_len = count_tokens(inp + '\n' + instr)
        if tok_len < min_tokens:
            stats['too_short'] += 1
            continue

        # bucket
        for lo,hi in buckets:
            if lo <= tok_len <= hi:
                stats['token_buckets'].setdefault(f"{lo}-{hi}",0)
                stats['token_buckets'][f"{lo}-{hi}"] += 1
                break

        cleaned.append(rec)
        stats['kept'] += 1

    # write cleaned
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open('w', encoding='utf-8') as f:
        for rec in cleaned:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')

    # write report
    report = {'stats': stats, 'min_tokens': min_tokens, 'tokenizer_available': TOKENIZER_AVAILABLE}
    with report_path.open('w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)

    return stats


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--input', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--report', required=True)
    p.add_argument('--min-tokens', type=int, default=6)
    args = p.parse_args()
    inp = Path(args.input)
    out = Path(args.out)
    rep = Path(args.report)
    stats = clean_and_stats(inp, out, rep, min_tokens=args.min_tokens)
    print(json.dumps(stats, indent=2))
