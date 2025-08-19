// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title ISaltView
/// @notice Read-only salt + CREATE2 helpers exposed via Diamond
interface ISaltView {
    function eip2470() external pure returns (address);

    function universalSalt(
        address deployer,
        string calldata content,
        uint256 crossNonce,
        string calldata version
    ) external pure returns (bytes32);

    function factorySalt(string calldata version) external pure returns (bytes32);

    function hashInitCode(bytes calldata initCode) external pure returns (bytes32);

    function predictCreate2(
        address deployer,
        bytes32 salt,
        bytes32 initCodeHash
    ) external pure returns (address);
}
