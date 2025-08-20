
// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title ISaltView
/// @notice Read-only salt + CREATE2 helpers exposed via Diamond
/// @dev Provides deterministic salt generation and CREATE2 address prediction functions
/// All functions are pure and stateless, making them gas-efficient and safe for view calls
interface ISaltView {
    /// @notice Returns the EIP-2470 deterministic factory address
    /// @return The EIP-2470 deterministic factory address
    function eip2470() external pure returns (address);

    /// @notice Generates a universal salt for CREATE2 deployments
    /// @param deployer The address of the deployer
    /// @param content Content used to generate the salt (e.g., contract name or description)
    /// @param crossNonce A nonce value to ensure uniqueness across deployments
    /// @param version Version string to differentiate between deployments
    /// @return A deterministic salt value for CREATE2 deployments
    function universalSalt(
        address deployer,
        string calldata content,
        uint256 crossNonce,
        string calldata version
    ) external pure returns (bytes32);

    /// @notice Generates a factory-specific salt for CREATE2 deployments
    /// @param version Version string to differentiate between factory deployments
    /// @return A deterministic salt value specific to factory deployments
    function factorySalt(string calldata version) external pure returns (bytes32);

    /// @notice Computes the keccak256 hash of initialization code
    /// @param initCode The initialization bytecode to hash
    /// @return The keccak256 hash of the initialization code
    function hashInitCode(bytes calldata initCode) external pure returns (bytes32);

    /// @notice Predicts a CREATE2 address for given parameters
    /// @param deployer The address that will deploy the contract
    /// @param salt The salt value for CREATE2 deployment
    /// @param initCodeHash The keccak256 hash of the initialization code
    /// @return The predicted CREATE2 address
    function predictCreate2(
        address deployer,
        bytes32 salt,
        bytes32 initCodeHash
    ) external pure returns (address);
}
