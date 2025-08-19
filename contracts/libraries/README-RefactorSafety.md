# RefactorSafety library and base contract

## What and why
- `RefactorSafetyLib.sol` provides lightweight, internal-only helpers for off-chain or deploy-time
  validation when refactoring or splitting monolithic contracts into facets.
  - Storage layout hashing & validation
  - Selector compatibility checks (pure & view variants)
  - Shallow codehash checks and a simple gas-guard helper

- `RefactorSafeFacetBase.sol` is a small, optional abstract base for facet contracts that
  want convenient guards and helpers for migration and validation. It intentionally keeps
  enforcement disabled by default (safe, low friction) and exposes a few overridable hooks:
  - `_getVersion()` defaults to `1` so facets don't need to override unless they track versions.
  - `_getExpectedCodeHash()` defaults to `bytes32(0)` which disables local codehash enforcement
    (recommended for production because `address(this)` is the dispatcher under delegatecall).
  - `_getStorageNamespace()` is abstract and forces implementers to choose a namespaced storage
    slot for compatibility checks.

## How to use
- For tests: inherit `RefactorSafeFacetBase` on your facet. Override `_getStorageNamespace()` and
  optionally `_getVersion()` or `_getExpectedCodeHash()` in local tests to assert behavior.
- Use `_performMigrationSafety(from, to, dataHash)` to emit a migration audit event and enforce
  monotonic version progression.
- Use `RefactorSafetyLib` helpers inside deploy/apply scripts (e.g. inside ManifestDispatcher)
  to validate codehash & selector compatibility before wiring routes.

## Safety notes
- `RefactorSafetyLib` is intended for off-chain or deployment-time checks. Do not rely on
  local codehash assertions in production facets under delegatecall.
- `RefactorSafeFacetBase` keeps enforcement opt-in via defaults; this keeps facet setup terse.

## Running tests
- Run `npm run test:refactor` to execute the sample `SampleFacet` tests which exercise base helpers.
