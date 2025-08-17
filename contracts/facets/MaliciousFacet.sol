// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IManifestDispatcher } from "../interfaces/IManifestDispatcher.sol";

/// @notice Facet used for testing reentrancy/role protections via delegatecall
contract MaliciousFacet {
    /// @dev Attempts to call governance method on dispatcher during delegatecall
    function attack(address dispatcher) external {
        // Call applyRoutes with empty arrays; should revert via AccessControl or ReentrancyGuard
        bytes4[] memory selectors = new bytes4[](0);
        address[] memory facets = new address[](0);
        bytes32[] memory codehashes = new bytes32[](0);
        bytes32[][] memory proofs = new bytes32[][](0);
        bool[][] memory isRight = new bool[][](0);
        IManifestDispatcher(dispatcher).applyRoutes(selectors, facets, codehashes, proofs, isRight);
    }
}
