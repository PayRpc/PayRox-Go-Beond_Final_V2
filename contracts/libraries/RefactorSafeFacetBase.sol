// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {RefactorSafetyLib} from "./RefactorSafetyLib.sol";

/**
 * @title RefactorSafeFacetBase
 * @notice Base helpers for refactor/upgrade-time safety.
 * @dev Do NOT rely on codehash checks under delegatecall:
 *      inside a dispatcher/diamond, `address(this)` is the dispatcher.
 *      Override `_getExpectedCodeHash()` in tests, leave default (0) in prod.
 */
abstract contract RefactorSafeFacetBase {
    // Events (emit from child init if you keep them)
    event RefactorSafetyInitialized(uint256 version, bytes32 codeHash);
    event RefactorValidationPassed(bytes32 indexed checkId, string checkType);

    // ───────────── Modifiers ─────────────
    modifier refactorSafe() {
        _validateRefactorSafety();
        _;
    }

    modifier versionCompatible(uint256 minVersion) {
        uint256 v = _getVersion();
        if (v < minVersion) revert RefactorSafetyLib.RefactorSafetyFailed("Version incompatible");
        _;
    }

    // ───────────── Abstract / hooks ─────────────
    /// @notice Override if you want a specific version; default=1 (min friction)
    function _getVersion() internal view virtual returns (uint256) { return 1; }

    /// @notice Force children to consider storage layout slot (e.g. PayRoxStorage.SLOT)
    function _getStorageNamespace() internal pure virtual returns (bytes32);

    /// @notice Default 0 disables codehash enforcement in production; override in tests
    function _getExpectedCodeHash() internal pure virtual returns (bytes32) { return bytes32(0); }

    // ───────────── Internal helpers ─────────────
    function _validateRefactorSafety() internal view {
        bytes32 expected = _getExpectedCodeHash();
        if (expected == bytes32(0)) return; // disabled
        // WARNING: under delegatecall, this compares dispatcher codehash
        bytes32 actual = address(this).codehash;
        if (actual != expected) {
            revert RefactorSafetyLib.RefactorSafetyFailed("Code hash mismatch (delegatecall?)");
        }
    }

    function _performMigrationSafety(
        uint256 fromVersion,
        uint256 toVersion,
        bytes32 dataHash
    ) internal {
        if (toVersion <= fromVersion) revert RefactorSafetyLib.RefactorSafetyFailed("Non-incrementing version");
        emit RefactorValidationPassed(
            keccak256(abi.encodePacked("MIGRATION", fromVersion, toVersion, dataHash)),
            "migration"
        );
    }

    /// @notice Shallow “am I what you think I am” check.
    /// @dev In a diamond call this compares the DISPATCHER’s codehash (by design).
    function emergencyRefactorValidation() external view returns (bool) {
        return RefactorSafetyLib.performRefactorSafetyCheck(
            address(this),
            _getExpectedCodeHash(),
            _getVersion()
        );
    }
}
