// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {RefactorSafeFacetBase} from "../../libraries/RefactorSafeFacetBase.sol";
import {RefactorSafetyLib} from "../../libraries/RefactorSafetyLib.sol";

/**
 * @title SampleFacet
 * @notice Demonstrates using RefactorSafeFacetBase with version + optional codehash.
 *         In production you likely override only _getStorageNamespace(); version/codehash
 *         defaults keep enforcement disabled unless explicitly set.
 */
contract SampleFacet is RefactorSafeFacetBase {
    // Example user storage (kept trivial). In a real facet you'd use a namespaced slot.
    uint256 private _value;

    // Version & codehash controls (override to show test behavior)
    function _getVersion() internal view override returns (uint256) { return 2; }
    function _getStorageNamespace() internal pure override returns (bytes32) { return keccak256("SAMPLE_FACET_V1"); }
    function _getExpectedCodeHash() internal pure override returns (bytes32) { return bytes32(0); } // disabled

    function setValue(uint256 v) external refactorSafe { _value = v; }
    function getValue() external view returns (uint256) { return _value; }

    // Migration example (no-op but emits event)
    function migrate(uint256 fromVersion, uint256 toVersion, bytes32 dataHash) external {
        _performMigrationSafety(fromVersion, toVersion, dataHash);
    }
}
