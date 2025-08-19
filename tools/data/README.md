Data utilities for cleaning and splitting fine-tuning datasets.

Scripts:

- clean_and_stats.py
  * Drops ultra-short inputs and exact duplicates
  * Produces a cleaned JSONL and a JSON token-stats report
  * Uses tiktoken if installed; otherwise falls back to a char heuristic

- train_val_split.py
  * Deterministic train/val split with optional stratification by token-length buckets
  * Default split is 90% train / 10% val, seedable

Example workflow:

```bash
python tools/data/clean_and_stats.py --input datasets/combined_instructions.jsonl \
  --out datasets/combined_clean.jsonl --report datasets/token_stats.json

python tools/data/train_val_split.py --input datasets/combined_clean.jsonl \
  --train datasets/train.jsonl --val datasets/val.jsonl --ratio 0.9 --seed 42
```

Defaults:
- Minimum tokens: 6 (configurable via --min-tokens)
- Token buckets: 0-32, 33-64, 65-128, 129-256, 257-512, 513+

If you want, I can also:
- Add near-duplicate detection (fuzzy dedupe) or language-model-based filtering
- Convert to Axolotl format for LoRA training (scripted)
- Add a small sanity-check unit test for the scripts
