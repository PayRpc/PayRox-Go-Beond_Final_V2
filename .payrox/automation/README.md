Automation plan: safe, review-first Solidity transforms

Goal
----
Provide conservative, automatable transforms that never modify original `contracts/` files in-place.
Each transformer:
- parses source with an AST parser
- computes a minimal set of edits or a fully-transformed file
- writes outputs (diff + transformed file) to `.payrox/generated/transformers/` for review

Planned transformers (initial stubs included):
1) Constructor → Initializer
   - Lift constructor params to an `initialize(...)` function
   - Guard re-entry (e.g. initializer modifier or reentrancy guard)
   - Migrate `immutable` values to storage assignments where necessary

2) Namespaced storage synthesis
   - Generate `{Facet}Storage` library stubs with `Layout` and `SLOT` constants
   - Rewrite state accesses `S.x` → `Layout(SLOT).x`

3) Modifier / role hoisting
   - Detect `onlyOwner` / `onlyRole` / `whenNotPaused` uses
   - Suggest hoisting mapping (facet-local vs shared guard)
   - Produce patched function headers with injected guard calls or modifier shims

Safety model
------------
- No edits to files under `contracts/`.
- All outputs go to `.payrox/generated/transformers/<timestamp>/`.
- Outputs include:
  - transformed .sol file (best-effort)
  - a JSON `changes.json` describing edits (line-level)
  - a human `report.md` describing decisions and confidence

How to run (dev)
-----------------
Node.js script deps (install in repo root):
  npm install --save-dev @solidity-parser/parser

Run an example:
  node scripts/tools/transformers/constructor-to-initialize.js contracts/MyFile.sol

Next actions
------------
- Implement more accurate AST-to-source rewriter (tools like Recast not currently used)
- Add tests that run on small fixture contracts and assert produced manifests and transformed files
