Parser-based facet splitter (prototype)

Overview
- Prototype tool to split a Solidity contract (facet) into smaller parts based on call-graph closure and FFD bin-packing.
- Emits `part_N.sol`, `part_N.json`, and `combined.json` into an output directory.

Quick start
1. Install dependencies (from repo root or tools/splitter):

   cd tools/splitter
   npm install

2. Run splitter (example):

   npx ts-node split-facet.ts --source ../../contracts/dispacher/ManifestDispacher.sol --contract ManifestDispatcher --out ../../artifacts/splits --softLimit 22000

3. Optional: enable compile-in-loop (needs hardhat available):

   npx ts-node split-facet.ts --source ... --contract ... --out ... --compile

Notes
- This is a prototype. The call-graph analysis is best-effort; for large projects, running with `--compile` gives accurate deployed-size measurements but requires a proper Hardhat environment.
- Next improvements: full AST-based inter-procedural analysis, storage access detection, library extraction automation, and deterministic formatter for emitted parts.
