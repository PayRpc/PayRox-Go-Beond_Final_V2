// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {RefactorSafetyLib} from "../../libraries/RefactorSafetyLib.sol";

/**
 * @title SampleFacet
 * @notice Demonstrates refactor safety without inheriting from RefactorSafeFacetBase
 *         to avoid selector collisions with emergencyRefactorValidation
 */
contract SampleFacet {
    // Example user storage (kept trivial). In a real facet you'd use a namespaced slot.
    uint256 private _value;

    function setValue(uint256 v) external { _value = v; }
    function getValue() external view returns (uint256) { return _value; }
}
