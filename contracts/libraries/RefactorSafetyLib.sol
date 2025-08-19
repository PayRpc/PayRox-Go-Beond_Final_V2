// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title RefactorSafetyLib
 * @notice Lightweight, upgrade-time safety helpers to validate refactors before wiring
 *         facets into a dispatcher/diamond. Intended for use in deploy scripts/tests,
 *         not on the hot path.
 *
 * @dev All functions are `internal` and cheap. Use zero values to opt-out:
 *      - expectedStructHash == 0  -> skip storage layout enforcement
 *      - expectedCodeHash  == 0   -> skip codehash enforcement
 */
library RefactorSafetyLib {
    // ───────────────────────── Events ─────────────────────────
    event RefactorSafetyCheck(bytes32 indexed facetId, uint256 version, bool passed);
    event StorageLayoutValidated(bytes32 indexed namespace, bytes32 structHash);
    event SelectorCompatibilityVerified(bytes4[] selectors, bool compatible);

    // ───────────────────────── Errors ─────────────────────────
    error IncompatibleStorageLayout(bytes32 expected, bytes32 actual);
    error SelectorMismatch(bytes4 expected, bytes4 actual);
    error RefactorSafetyFailed(string reason);

    // ───────────────── Storage Layout Safety ─────────────────
    /**
     * @notice Validates storage layout compatibility between versions.
     *         If `expectedStructHash` is zero, the check is skipped (graceful adoption).
     */
    function validateStorageLayout(
        bytes32 namespace,
        bytes32 expectedStructHash,
        bytes32 actualStructHash
    ) internal {
        if (expectedStructHash != bytes32(0) && expectedStructHash != actualStructHash) {
            revert IncompatibleStorageLayout(expectedStructHash, actualStructHash);
        }
        emit StorageLayoutValidated(namespace, actualStructHash);
    }

    /**
     * @notice Deterministic hash for storage structure validation (simple domain-separated keccak).
     */
    function hashStorageStruct(bytes memory structDefinition) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("STORAGE_STRUCT_V1:", structDefinition));
    }

    // ──────────────── Selector Compatibility ────────────────
    /**
     * @notice Ensures all old selectors still exist in the new set.
     *         If `allowAdditions` is false, new set must be same length as old.
     * @dev O(n^2) but called only at upgrade time; acceptable for facet sizes.
     */
    function validateSelectorCompatibility(
        bytes4[] memory oldSelectors,
        bytes4[] memory newSelectors,
        bool allowAdditions
    ) internal {
        // every old selector must still exist
        for (uint256 i = 0; i < oldSelectors.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < newSelectors.length; j++) {
                if (oldSelectors[i] == newSelectors[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                // provide explicit mismatch information (actual=0x00000000 indicates missing)
                revert SelectorMismatch(oldSelectors[i], bytes4(0));
            }
        }

        if (!allowAdditions && newSelectors.length != oldSelectors.length) {
            revert RefactorSafetyFailed("Selector additions not permitted");
        }

        emit SelectorCompatibilityVerified(newSelectors, true);
    }

    /**
     * @notice Hash a selector set in a deterministic way for off-chain comparison.
     * @dev Sorts a memory copy (insertion sort) to avoid order sensitivity, then keccak256.
     */
    function hashSelectors(bytes4[] memory selectors) internal pure returns (bytes32) {
        uint256 n = selectors.length;
        for (uint256 i = 1; i < n; i++) {
            bytes4 key = selectors[i];
            uint256 j = i;
            while (j > 0 && uint32(selectors[j - 1]) > uint32(key)) {
                selectors[j] = selectors[j - 1];
                unchecked { --j; }
            }
            selectors[j] = key;
        }
        return keccak256(abi.encodePacked(selectors));
    }

    // ─────────────────── Gas Guard (Optional) ───────────────────
    /**
     * @notice Validates gas doesn’t regress beyond threshold vs baseline.
     * @param baselineGas   reference gas (must be > 0)
     * @param actualGas     measured gas of refactored function
     * @param maxDeviationBps  allowed deviation in basis points (100 = 1%)
     */
    function validateGasEfficiency(
        bytes4 /*functionSelector*/,
        uint256 baselineGas,
        uint256 actualGas,
        uint256 maxDeviationBps
    ) internal pure {
        require(baselineGas > 0, "baselineGas=0");
        if (actualGas > baselineGas) {
            uint256 increaseBps = ((actualGas - baselineGas) * 10_000) / baselineGas;
            if (increaseBps > maxDeviationBps) {
                revert RefactorSafetyFailed("Gas efficiency degradation exceeds threshold");
            }
        }
    }

    // ──────────────── Runtime Safety (Shallow) ────────────────
    /**
     * @notice Shallow codehash check (skip if expectedCodeHash == 0). Emits RefactorSafetyCheck.
     * @param facetAddress      the facet to check
     * @param expectedCodeHash  keccak256(runtime bytecode) to enforce, or 0 to skip
     * @param requiredVersion   arbitrary version number you want to log (for audit trails)
     */
    function performRefactorSafetyCheck(
        address facetAddress,
        bytes32 expectedCodeHash,
        uint256 requiredVersion
    ) internal view returns (bool passed) {
        passed = (expectedCodeHash == bytes32(0) || facetAddress.codehash == expectedCodeHash);
        bytes32 facetId = keccak256(abi.encodePacked(facetAddress));
        // emit RefactorSafetyCheck(facetId, requiredVersion, passed); // optional; see note in base
        facetId; requiredVersion; // silence unused vars if event disabled
        return passed;
    }

    /**
     * @notice Ensures all old selectors still exist in the new set.
     *         If `allowAdditions` is false, new set must be same length as old.
     * @dev Pure variant of `validateSelectorCompatibility`; no emits, for use in view contexts.
     */
    function validateSelectorCompatibilityView(
        bytes4[] memory oldSelectors,
        bytes4[] memory newSelectors,
        bool allowAdditions
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < oldSelectors.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < newSelectors.length; j++) {
                if (oldSelectors[i] == newSelectors[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                revert SelectorMismatch(oldSelectors[i], bytes4(0));
            }
        }
        if (!allowAdditions && newSelectors.length != oldSelectors.length) {
            revert RefactorSafetyFailed("Selector additions not permitted");
        }
        return true;
    }
}

/**
 * @title RefactorSafeFacetBase
 * @notice Optional base for facets. **Do NOT** rely on codehash checks under delegatecall:
 *         inside a dispatcher/diamond, `address(this)` is the dispatcher, not the facet.
 *         Use this base in tests or set `_getExpectedCodeHash()` to `bytes32(0)` in production
 *         to effectively disable the local codehash check.
 */
abstract contract RefactorSafeFacetBase {
    using RefactorSafetyLib for *;

    // ───────────────────── Events ─────────────────────
    event RefactorSafetyInitialized(uint256 version, bytes32 codeHash);
    event RefactorValidationPassed(bytes32 indexed checkId, string checkType);

    // ───────────────────── Modifiers ──────────────────
    modifier refactorSafe() {
        _validateRefactorSafety();
        _;
    }

    modifier versionCompatible(uint256 minVersion) {
        require(_getVersion() >= minVersion, "Version incompatible");
        _;
    }

    // ─────────────── Abstract hooks (implement) ───────────────
    function _getVersion() internal view virtual returns (uint256);
    function _getStorageNamespace() internal pure virtual returns (bytes32);
    function _getExpectedCodeHash() internal pure virtual returns (bytes32);

    // ─────────────── Internal safety helpers ───────────────
    function _validateRefactorSafety() internal view {
        // WARNING: under delegatecall this is dispatcher code.
        bytes32 expected = _getExpectedCodeHash();
        if (expected == bytes32(0)) {
            // enforcement disabled
            return;
        }
        bytes32 actual = address(this).codehash;
        if (actual != expected) {
            revert RefactorSafetyLib.RefactorSafetyFailed("Code hash mismatch (delegatecall?)");
        }
    }

    /**
     * @notice Example migration guard; emits an audit trail.
     */
    function _performMigrationSafety(
        uint256 fromVersion,
        uint256 toVersion,
        bytes32 dataHash
    ) internal {
        // Basic monotonic progression check (minor/patch semantics live off-chain)
        require(toVersion > fromVersion, "Non-incrementing version");
        emit RefactorValidationPassed(
            keccak256(abi.encodePacked("MIGRATION", fromVersion, toVersion, dataHash)),
            "migration"
        );
    }

    // ─────────────── External convenience (read-only) ───────────────
    /**
     * @notice Shallow, read-only “am I what you think I am” check.
     * @dev Returns true if `_getExpectedCodeHash()` is zero or matches `address(this).codehash`.
     *      In a real diamond call, this will compare the dispatcher’s codehash.
     */
    function emergencyRefactorValidation() external view returns (bool) {
        return RefactorSafetyLib.performRefactorSafetyCheck(
            address(this),
            _getExpectedCodeHash(),
            _getVersion()
        );
    }
}
