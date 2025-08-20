// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title VersionFacet
/// @notice Minimal facet exposing package version information for canary scripts and tooling
contract VersionFacet {
    /// @notice Human-readable semantic version
    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    /// @notice Numeric version useful for programmatic checks
    function versionNumber() external pure returns (uint256) {
        return 1;
    }
}
