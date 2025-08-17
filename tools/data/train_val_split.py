"""Deterministic train/val split with optional stratification by token-length buckets,
de-duplication, and basic stats.

Usage:
  python tools/data/train_val_split.py --input datasets/combined_clean.jsonl \
      --train datasets/train.jsonl --val datasets/val.jsonl --ratio 0.9 --seed 42 \
      --stats datasets/split_stats.json --min-tokens 16 --dedupe
"""
from __future__ import annotations
import argparse, json, random, hashlib
from pathlib import Path
from typing import List, Dict, Any, Tuple

try:
    import tiktoken
    TOKENIZER_AVAILABLE = True
except Exception:
    TOKENIZER_AVAILABLE = False

# --------------- IO -----------------
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

def write_jsonl(path: Path, rows: List[Dict[str, Any]]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')

# --------------- Token utils -----------------
def get_encoder(model: str = 'gpt-3.5-turbo'):
    if TOKENIZER_AVAILABLE:
        try:
            return tiktoken.encoding_for_model(model)
        except Exception:
            return tiktoken.get_encoding("cl100k_base")
    return None

def count_tokens(text: str, enc=None) -> int:
    if enc is not None:
        return len(enc.encode(text))
    # fallback heuristic ~4 chars/token
    return max(1, len(text) // 4)

def bucket_token_count(tok_len: int) -> str:
    if tok_len <= 32:   return '0-32'
    if tok_len <= 64:   return '33-64'
    if tok_len <= 128:  return '65-128'
    if tok_len <= 256:  return '129-256'
    if tok_len <= 512:  return '257-512'
    if tok_len <= 1024: return '513-1024'
    return '1025+'

# --------------- Preprocessing -----------------
def normalize_key(s: str) -> str:
    # light normalization for de-dupe
    return ' '.join((s or '').strip().lower().split())

def record_key(rec: Dict[str, Any]) -> str:
    prompt = normalize_key(f"{rec.get('instruction','')}\n{rec.get('input','')}")
    # stable hash for sets
    return hashlib.sha1(prompt.encode('utf-8')).hexdigest()

def filter_and_dedupe(records: List[Dict[str, Any]],
                      enc,
                      min_tokens: int | None,
                      max_tokens: int | None,
                      dedupe: bool) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    seen = set()
    kept, dropped_short, dropped_long, dropped_dupe = [], 0, 0, 0
    buckets: Dict[str, int] = {}

    for r in records:
        prompt = f"{r.get('instruction','')}\n{r.get('input','')}"
        tok = count_tokens(prompt, enc)
        if min_tokens and tok < min_tokens:
            dropped_short += 1
            continue
        if max_tokens and tok > max_tokens:
            dropped_long += 1
            continue
        if dedupe:
            k = record_key(r)
            if k in seen:
                dropped_dupe += 1
                continue
            seen.add(k)
        b = bucket_token_count(tok)
        buckets[b] = buckets.get(b, 0) + 1
        kept.append(r)

    stats = {
        "total_in": len(records),
        "kept": len(kept),
        "dropped_short": dropped_short,
        "dropped_long": dropped_long,
        "dropped_dupe": dropped_dupe,
        "prompt_bucket_histogram": dict(sorted(buckets.items(),
                                     key=lambda kv: (len(kv[0]), kv[0]))),
    }
    return kept, stats

# --------------- Split -----------------
def split_dataset(input_path: Path, train_path: Path, val_path: Path,
                  ratio: float = 0.9, seed: int = 42, stratify: bool = True,
                  min_tokens: int | None = None, max_tokens: int | None = None,
                  dedupe: bool = False, stats_out: Path | None = None,
                  model_for_tokens: str = 'gpt-3.5-turbo'):
    enc = get_encoder(model_for_tokens)
    raw = list(load_jsonl(input_path))
    # filter + dedupe first (prevents leaking duplicates across splits)
    filtered, pre_stats = filter_and_dedupe(raw, enc, min_tokens, max_tokens, dedupe)

    rnd = random.Random(seed)
    rnd.shuffle(filtered)

    if not stratify:
        cutoff = int(len(filtered) * ratio)
        train = filtered[:cutoff]
        val = filtered[cutoff:]
        bucket_stats = {}
    else:
        # Group by token buckets to preserve length distribution
        groups: Dict[str, List[Dict[str, Any]]] = {}
        for r in filtered:
            tok = count_tokens(f"{r.get('instruction','')}\n{r.get('input','')}", enc)
            b = bucket_token_count(tok)
            groups.setdefault(b, []).append(r)
        train, val = [], []
        bucket_stats = { "train": {}, "val": {} }
        for b, items in groups.items():
            rnd.shuffle(items)
            cutoff = int(len(items) * ratio)
            t, v = items[:cutoff], items[cutoff:]
            train.extend(t); val.extend(v)
            bucket_stats["train"][b] = len(t)
            bucket_stats["val"][b] = len(v)

    write_jsonl(train_path, train)
    write_jsonl(val_path, val)

    result = {
        "train": len(train),
        "val": len(val),
        "ratio": ratio,
        "seed": seed,
        "stratified": stratify,
        **pre_stats,
        "split_bucket_counts": bucket_stats,
        "input": str(input_path),
        "train_out": str(train_path),
        "val_out": str(val_path),
    }

    if stats_out:
        stats_out.parent.mkdir(parents=True, exist_ok=True)
        stats_out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')

    return result

# --------------- CLI -----------------
if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', required=True)
    ap.add_argument('--train', required=True)
    ap.add_argument('--val', required=True)
    ap.add_argument('--ratio', type=float, default=0.9)
    ap.add_argument('--seed', type=int, default=42)
    ap.add_argument('--no-stratify', dest='stratify', action='store_false')
    ap.add_argument('--min-tokens', type=int, default=None)
    ap.add_argument('--max-tokens', type=int, default=None)
    ap.add_argument('--dedupe', action='store_true')
    ap.add_argument('--stats', type=str, default=None)
    ap.add_argument('--tokenizer-model', type=str, default='gpt-3.5-turbo')
    args = ap.parse_args()

    res = split_dataset(
        Path(args.input), Path(args.train), Path(args.val),
        ratio=args.ratio, seed=args.seed, stratify=args.stratify,
        min_tokens=args.min_tokens, max_tokens=args.max_tokens,
        dedupe=args.dedupe,
        stats_out=Path(args.stats) if args.stats else None,
        model_for_tokens=args.tokenizer_model
    )
    print(json.dumps(res, indent=2))
