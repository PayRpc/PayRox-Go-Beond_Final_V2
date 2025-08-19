# PayRox — Pinned Context Pack (Go-Beyond)

This file contains short, high-signal facts the analyzer and RAG endpoints should always see.
Do not modify unless you own the PayRox project.

- Project: PayRox Go-Beyond (internal name)
- Primary language: Solidity ^0.8.x
- Architectural pattern: Diamond (EIP-2535) with facets and a dispatcher/diamond proxy per network
- Important: Do NOT change original PayRox contracts without explicit approval
- Network tokens: Terra-stake ecosystem; several contracts reference liquidity/reward distribution
- Dispatcher mapping: Add network->dispatcher address mappings to arch/facts.json for exact emitter hints
- ABI/Selectors: Keep ABI stability; facetization should group selectors by logical responsibilities (core, administrative, liquidity, rewards)
- Expected merkle leaf encoding: keccak256(abi.encode(bytes4,address,bytes32))

# Short usage notes

- This file is loaded automatically by the server and included in LLM prompts as "PinnedFacts".
- Keep it small (<16KB) for prompt performance.
