// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Minimal test-only interface for EIP-2535 diamondCut used by tests.
/// This file is a shim so test code that expects an IDiamondCut artifact can compile.
interface IDiamondCut {
    enum FacetCutAction {Add, Replace, Remove}

    struct FacetCut {
        address facetAddress;
        FacetCutAction action;
        bytes4[] functionSelectors;
    }

    /// @notice Standard diamondCut entry used by many tooling/test harnesses
    /// @param _diamondCut Array of facet cut instructions
    /// @param _init Address to delegatecall for initialization (or address(0))
    /// @param _calldata Calldata for the _init call
    function diamondCut(FacetCut[] calldata _diamondCut, address _init, bytes calldata _calldata) external;
}
