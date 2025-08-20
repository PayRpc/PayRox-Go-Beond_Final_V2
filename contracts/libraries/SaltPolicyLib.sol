// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title SaltPolicyLib
/// @notice Canonical salt + CREATE2 helpers used across PayRox
library SaltPolicyLib {
    /// @dev EIP-2470 singleton CREATE2 deployer (widely deployed)
    // Address literal uses checksum casing to satisfy Solidity's address literal rules.
    address internal constant EIP2470 = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    /// @notice Compute universal cross-chain salt (mirrors off-chain script)
    /// @dev Uses abi.encodePacked to match TS `ethers.solidityPacked`. No adjacent dynamic types.
    function universalSalt(
        address deployer,
        string memory content,
        uint256 crossNonce,
        string memory version
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "PayRoxCrossChain",
                deployer,
                content,
                crossNonce,
                version
            )
        );
    }

    /// @notice Salt for deterministic factory via EIP-2470
    function factorySalt(string memory version) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("PayRoxFactory", version));
    }

    /// @notice keccak256(initCode)
    function initCodeHash(bytes memory initCode) internal pure returns (bytes32) {
        return keccak256(initCode);
    }

    /// @notice Deterministic CREATE2 address (EVM canon)
    /// @param deployer The CREATE2 deployer address (e.g., EIP-2470 or the factory)
    /// @param salt     32-byte salt
    /// @param initHash keccak256(initCode)
    function create2Address(
        address deployer,
        bytes32 salt,
        bytes32 initHash
    ) internal pure returns (address addr) {
        // address = keccak256(0xff ++ deployer ++ salt ++ init_code_hash)[12:]
        bytes32 digest = keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, initHash));
        addr = address(uint160(uint256(digest)));
    }
}
