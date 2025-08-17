#!/usr/bin/env python3
"""Heuristically fill empty `output` fields in dataset JSONL files then combine.

Designed for no-GPU environments: uses simple regex + pattern extraction from
Solidity fragments and function signatures. Leaves original source files
unchanged; writes new *_filled.jsonl plus combined_instructions.jsonl.

Input (expected in ./datasets):
  - summarization_instructions.jsonl
  - function_signatures.jsonl

Output (created in ./datasets):
  - summarization_instructions_filled.jsonl
  - function_signatures_filled.jsonl
  - combined_instructions.jsonl (shuffled, stable seed)

Heuristics:
  * Summaries: prefer @title / @notice tags; else derive from contract name and
    presence of ROLE constants, storage sections, limits.
  * Function explanations: describe purpose from name prefix (submit, certify,
    revoke, get, set, update) + role modifiers (onlyRole(...)) and parameter list.
"""
from __future__ import annotations
import json, re, random
from pathlib import Path
from typing import Iterable, Dict, Any

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'datasets'

SUM_FILE = DATA / 'summarization_instructions.jsonl'
FUNC_FILE = DATA / 'function_signatures.jsonl'

OUT_SUM = DATA / 'summarization_instructions_filled.jsonl'
OUT_FUNC = DATA / 'function_signatures_filled.jsonl'
OUT_COMBINED = DATA / 'combined_instructions.jsonl'

CONTRACT_NAME_RE = re.compile(r"contract\s+([A-Za-z0-9_]+)")
TITLE_RE = re.compile(r"@title\s+(.+)")
NOTICE_RE = re.compile(r"@notice\s+(.+)")
ROLE_CONST_RE = re.compile(r"bytes32\s+public\s+constant\s+([A-Z0-9_]+_ROLE)")

FUNC_NAME_RE = re.compile(r"function\s+([A-Za-z0-9_]+)")
PARAM_RE = re.compile(r"function\s+[A-Za-z0-9_]+\s*\((.*?)\)")
ONLY_ROLE_RE = re.compile(r"onlyRole\(([^)]+)\)")


def _iter_jsonl(path: Path) -> Iterable[Dict[str, Any]]:
    with path.open('r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except Exception:
                continue


def summarize_fragment(fragment: str) -> str:
    # Tags supersede heuristics
    for regex in (TITLE_RE, NOTICE_RE):
        m = regex.search(fragment)
        if m:
            return m.group(1).strip().rstrip('.') + '.'
    # Contract name
    cn = None
    m = CONTRACT_NAME_RE.search(fragment)
    if m:
        cn = m.group(1)
    roles = ROLE_CONST_RE.findall(fragment)
    sections = []
    if 'Roles' in fragment:
        sections.append('roles')
    if 'Storage' in fragment:
        sections.append('storage')
    if 'Limits' in fragment:
        sections.append('limits')
    base = f"Fragment from contract {cn}" if cn else "Solidity fragment"
    if roles:
        base += f" defining roles ({', '.join(r[:20] for r in roles[:4])})"
    if sections:
        base += f" covering {', '.join(sections)}"
    return base + '.'


def explain_function(sig: str, surrounding: str) -> str:
    name_match = FUNC_NAME_RE.search(sig)
    name = name_match.group(1) if name_match else 'function'
    # parameters list
    params_match = PARAM_RE.search(sig)
    params = []
    if params_match:
        raw_params = params_match.group(1).strip()
        if raw_params:
            for p in raw_params.split(','):
                pv = p.strip().split()  # type + name
                if pv:
                    params.append(pv[-1])
    role_match = ONLY_ROLE_RE.search(sig) or ONLY_ROLE_RE.search(surrounding)
    role_part = ''
    if role_match:
        role_part = f" Restricted to {role_match.group(1)}." if 'ROLE' in role_match.group(1) else f" Requires {role_match.group(1)}."  # simple
    intent = ''
    lowered = name.lower()
    if lowered.startswith('submit'):
        intent = 'Submits a new record'
    elif lowered.startswith('certify'):
        intent = 'Certifies an address/action'
    elif lowered.startswith('revoke'):
        intent = 'Revokes a previously granted permission or record'
    elif lowered.startswith('get'):
        intent = 'Reads and returns stored data'
    elif lowered.startswith('set') or lowered.startswith('update'):
        intent = 'Updates stored state'
    elif lowered.startswith('apply'):
        intent = 'Applies a pending change'
    elif lowered.startswith('activate'):
        intent = 'Activates a manifest or configuration'
    else:
        intent = 'Executes core logic'
    param_part = f" Params: {', '.join(params)}." if params else ''
    return f"{intent}.{param_part}{role_part}".strip()


def process_summaries():
    filled = []
    for rec in _iter_jsonl(SUM_FILE):
        if not rec.get('output'):
            rec['output'] = summarize_fragment(rec.get('input',''))
        filled.append(rec)
    with OUT_SUM.open('w', encoding='utf-8') as f:
        for rec in filled:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    return len(filled)


def process_functions():
    filled = []
    for rec in _iter_jsonl(FUNC_FILE):
        if not rec.get('output'):
            rec['output'] = explain_function(rec.get('signature',''), rec.get('surrounding_code',''))
        filled.append(rec)
    with OUT_FUNC.open('w', encoding='utf-8') as f:
        for rec in filled:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    return len(filled)


def combine_shuffle():
    records = []
    for path in (OUT_SUM, OUT_FUNC):
        records.extend(list(_iter_jsonl(path)))
    random.Random(42).shuffle(records)
    with OUT_COMBINED.open('w', encoding='utf-8') as f:
        for rec in records:
            # unify field set: ensure instruction/input/output present
            if 'input' not in rec:
                # function record -> create input from surrounding_code
                rec['input'] = rec.get('surrounding_code','')
            f.write(json.dumps({k: rec.get(k,'') for k in ('instruction','input','output')}, ensure_ascii=False) + '\n')
    return len(records)


def main():
    if not SUM_FILE.exists() or not FUNC_FILE.exists():
        raise SystemExit('Required dataset files not found. Run export script first.')
    s = process_summaries()
    f = process_functions()
    c = combine_shuffle()
    print(f"Filled summaries: {s}; functions: {f}; combined: {c}")
    print(f"Outputs -> {OUT_SUM.name}, {OUT_FUNC.name}, {OUT_COMBINED.name}")


if __name__ == '__main__':
    main()
