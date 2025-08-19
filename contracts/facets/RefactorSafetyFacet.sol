// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {RefactorSafetyLib} from "../libraries/RefactorSafetyLib.sol";

/**
 * @title RefactorSafetyFacet
 * @notice Centralized refactor safety validation for the diamond
 * @dev Provides emergencyRefactorValidation as a single facet to avoid selector collisions
 */
contract RefactorSafetyFacet {
    // Events
    event RefactorSafetyInitialized(uint256 version, bytes32 codeHash);
    event RefactorValidationPassed(bytes32 indexed checkId, string checkType);

    /// @notice Centralized emergency refactor validation
    /// @dev This replaces the emergencyRefactorValidation from RefactorSafeFacetBase
    /// @return true if refactor safety checks pass
    function emergencyRefactorValidation() external view returns (bool) {
        return RefactorSafetyLib.performRefactorSafetyCheck(
            address(this),
            bytes32(0), // Default: no codehash enforcement in production
            1  // Default version
        );
    }
    
    /// @notice Get the current version for safety checks
    /// @return version number
    function getRefactorSafetyVersion() external pure returns (uint256) {
        return 1;
    }
}
