// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { ISaltView } from "../interfaces/ISaltView.sol";
import { SaltPolicyLib as SPL } from "../libraries/SaltPolicyLib.sol";

/// @title SaltViewFacet
/// @notice Pure/view helpers for deterministic address planning
/// @dev No loupe/165 here; ERC-165 is centralized per repo policy.
contract SaltViewFacet is ISaltView {
    function eip2470() external pure returns (address) {
        return SPL.EIP2470;
    }

    function universalSalt(
        address deployer,
        string calldata content,
        uint256 crossNonce,
        string calldata version
    ) external pure returns (bytes32) {
        return SPL.universalSalt(deployer, content, crossNonce, version);
    }

    function factorySalt(string calldata version) external pure returns (bytes32) {
        return SPL.factorySalt(version);
    }

    function hashInitCode(bytes calldata initCode) external pure returns (bytes32) {
        return SPL.initCodeHash(initCode);
    }

    function predictCreate2(
        address deployer,
        bytes32 salt,
        bytes32 initCodeHash
    ) external pure returns (address) {
        return SPL.create2Address(deployer, salt, initCodeHash);
    }
}
