// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title ChunkFactoryLib
/// @notice Library containing heavy logic for DeterministicChunkFactory to reduce contract size
library ChunkFactoryLib {
    /// @dev EIP-3860 init-code size limit to prevent CREATE2 bomb attacks
    uint256 internal constant MAX_INIT_CODE_SIZE = 49_152;

    /// @dev Revert prologue size: 0x60006000fd = PUSH1 0x00; PUSH1 0x00; REVERT (5 bytes)
    uint256 internal constant CHUNK_PROLOGUE_SIZE = 5;

    /// @dev Maximum chunk size to prevent excessive gas usage
    uint256 internal constant MAX_CHUNK_SIZE = 24_000;

    error ChunkTooLarge();
    error InvalidBytecode();
    error DeploymentFailed();
    error SystemIntegrityFailed();

    /// @notice Validates that data can be safely deployed as a chunk
    /// @param data The data to validate
    /// @return valid True if data passes all validation checks
    function validateData(bytes memory data) internal pure returns (bool valid) {
        // Check chunk size limits
        if (data.length > MAX_CHUNK_SIZE) return false;

        // Check init code size (data + prologue)
        if (data.length + CHUNK_PROLOGUE_SIZE > MAX_INIT_CODE_SIZE) return false;

        return true;
    }

    /// @notice Validates bytecode size for CREATE2 deployment
    /// @param bytecode The bytecode to validate
    /// @return valid True if bytecode passes validation
    function validateBytecodeSize(bytes memory bytecode) internal pure returns (bool valid) {
        return bytecode.length <= MAX_INIT_CODE_SIZE;
    }

    /// @notice Verifies system integrity against expected hashes
    /// @param dispatcher The manifest dispatcher address
    /// @param expectedManifestHash Expected hash of the manifest dispatcher
    /// @param expectedFactoryHash Expected hash of the factory bytecode
    /// @param factoryAddress The factory address to check
    /// @return valid True if all integrity checks pass
    function verifySystemIntegrity(
        address dispatcher,
        bytes32 expectedManifestHash,
        bytes32 expectedFactoryHash,
        address factoryAddress
    ) internal view returns (bool valid) {
        // Check manifest dispatcher
        if (dispatcher != address(0) && expectedManifestHash != bytes32(0)) {
            if (dispatcher.codehash != expectedManifestHash) return false;
        }

        // Check factory bytecode
        if (expectedFactoryHash != bytes32(0)) {
            if (factoryAddress.codehash != expectedFactoryHash) return false;
        }

        return true;
    }

    /// @notice Creates init code for a chunk deployment
    /// @param data The data to wrap in init code
    /// @return initCode The complete init code for CREATE2
    function createInitCode(bytes calldata data) internal pure returns (bytes memory initCode) {
        // Create init code that deploys a simple contract containing the data
        // The deployed contract just contains the raw data

        bytes memory runtimeCode = data;
        uint256 runtimeSize = runtimeCode.length;

        bytes memory creationCode;
        uint256 creationCodeSize;

        if (runtimeSize <= 0xff) {
            // Creation code size is 7 bytes for PUSH1 variant
            creationCodeSize = 7;
            creationCode = abi.encodePacked(
                hex"60", uint8(runtimeSize),    // PUSH1 size
                hex"80",                        // DUP1 (copy size to stack)
                hex"60", uint8(creationCodeSize), // PUSH1 creationCodeSize (offset where runtime starts)
                hex"6000",                      // PUSH1 0 (destOffset)
                hex"39",                        // CODECOPY
                hex"6000",                      // PUSH1 0
                hex"f3"                         // RETURN
            );
        } else if (runtimeSize <= 0xffff) {
            // Creation code size is 9 bytes for PUSH2 variant
            creationCodeSize = 9;
            creationCode = abi.encodePacked(
                hex"61", uint16(runtimeSize),   // PUSH2 size
                hex"80",                        // DUP1
                hex"61", uint16(creationCodeSize), // PUSH2 creationCodeSize
                hex"6000",                      // PUSH1 0
                hex"39",                        // CODECOPY
                hex"6000",                      // PUSH1 0
                hex"f3"                         // RETURN
            );
        } else {
            revert("Data too large");
        }

        initCode = abi.encodePacked(creationCode, runtimeCode);
    }

    /// @notice Reads data from a deployed chunk contract (optimized assembly version)
    /// @param chunk The address of the chunk contract
    /// @return data The data stored in the chunk
    function readChunk(address chunk) internal view returns (bytes memory data) {
        if (chunk == address(0)) return new bytes(0);

        uint256 codeSize;
        assembly {
            codeSize := extcodesize(chunk)
        }

        if (codeSize <= CHUNK_PROLOGUE_SIZE) return new bytes(0);

        uint256 dataSize = codeSize - CHUNK_PROLOGUE_SIZE;

        assembly {
            // Allocate memory for data
            data := mload(0x40)
            mstore(data, dataSize)
            mstore(0x40, add(data, and(add(add(dataSize, 0x20), 0x1f), not(0x1f))))

            // Copy code starting from offset CHUNK_PROLOGUE_SIZE, skipping the prologue
            extcodecopy(chunk, add(data, 0x20), CHUNK_PROLOGUE_SIZE, dataSize)
        }
    }

    /// @notice Computes the deterministic salt for chunk deployment
    /// @param data The chunk data
    /// @return salt The CREATE2 salt
    function computeSalt(bytes calldata data) internal pure returns (bytes32 salt) {
        bytes32 dataHash = keccak256(data);
        salt = keccak256(abi.encodePacked("chunk:", dataHash));
    }

    /// @notice Predicts the deployment address for given salt and init code
    /// @param deployer The deployer address
    /// @param salt The CREATE2 salt
    /// @param initCodeHash The hash of the init code
    /// @return predicted The predicted deployment address
    function predictAddress(
        address deployer,
        bytes32 salt,
        bytes32 initCodeHash
    ) internal pure returns (address predicted) {
        predicted = address(uint160(uint256(keccak256(abi.encodePacked(
            hex"ff",
            deployer,
            salt,
            initCodeHash
        )))));
    }

    /// @notice Deploy deterministic contract with system integrity checks
    /// @param salt The CREATE2 salt
    /// @param initCode The contract init code
    /// @param deployer The deployer address
    /// @param dispatcher The manifest dispatcher address
    /// @param expectedManifest Expected manifest hash
    /// @param expectedFactory Expected factory hash
    /// @return deployed The deployed contract address
    function deployDeterministic(
        bytes32 salt,
        bytes memory initCode,
        address deployer,
        address dispatcher,
        bytes32 expectedManifest,
        bytes32 expectedFactory
    ) internal returns (address deployed) {
        // Verify system integrity
        require(verifySystemIntegrity(dispatcher, expectedManifest, expectedFactory, deployer), "System integrity failed");

        // Validate bytecode size
        require(validateBytecodeSize(initCode), "Bytecode too large");

        bytes32 codeHash = keccak256(initCode);
        deployed = predictAddress(deployer, salt, codeHash);

        if (deployed.code.length == 0) {
            assembly {
                deployed := create2(0, add(initCode, 0x20), mload(initCode), salt)
            }
            require(deployed != address(0), "Deployment failed");
            require(deployed == predictAddress(deployer, salt, codeHash), "Address mismatch");
        }
    }

    /// @notice Batch predict addresses
    /// @param deployer The deployer address
    /// @param salts Array of CREATE2 salts
    /// @param codeHashes Array of init code hashes
    /// @return predicted Array of predicted addresses
    function predictAddressBatch(
        address deployer,
        bytes32[] memory salts,
        bytes32[] memory codeHashes
    ) internal pure returns (address[] memory predicted) {
        require(salts.length == codeHashes.length, "Array length mismatch");
        predicted = new address[](salts.length);

        for (uint256 i = 0; i < salts.length; i++) {
            predicted[i] = predictAddress(deployer, salts[i], codeHashes[i]);
        }
    }

    /// @dev Encodes data size as minimal PUSH instruction
    function _encodeDataSize(uint256 size) private pure returns (bytes memory) {
        if (size <= 0xff) {
            return abi.encodePacked(hex"60", uint8(size)); // PUSH1
        } else if (size <= 0xffff) {
            return abi.encodePacked(hex"61", uint16(size)); // PUSH2
        } else if (size <= 0xffffff) {
            return abi.encodePacked(hex"62", uint24(size)); // PUSH3
        } else {
            return abi.encodePacked(hex"63", uint32(size)); // PUSH4
        }
    }
}
