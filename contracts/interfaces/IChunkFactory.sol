
// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Interface aligned to DeterministicChunkFactory v2 surface (Option A).
/// @dev This interface provides deterministic deployment and data staging functionality
/// with comprehensive access control, batch operations, and gas-efficient design patterns.
interface IChunkFactory {
    // -------- Core staging / deploying --------

    /// @notice Stage a single chunk; returns deployed chunk address and keccak256(data)
    /// @param data The chunk data to be staged
    /// @return chunk Address of the deployed chunk contract
    /// @return hash keccak256 hash of the staged data
    function stage(bytes calldata data)
        external
        payable
        returns (address chunk, bytes32 hash);

    /// @notice Stage many chunks; fee charged per item; returns deployed chunk addresses
    /// @param dataArray Array of chunk data to be staged
    /// @return chunks Array of addresses of deployed chunk contracts
    function stageMany(bytes[] calldata dataArray)
        external
        payable
        returns (address[] memory chunks);

    /// @notice Stage many chunks and return content hashes; emits BatchStaged with packed metadata
    /// @param blobs Array of chunk data to be staged
    /// @return chunks Array of addresses of deployed chunk contracts
    /// @return hashes Array of keccak256 hashes of the staged data
    function stageBatch(bytes[] calldata blobs)
        external
        payable
        returns (address[] memory chunks, bytes32[] memory hashes);

    /// @notice Deterministic deploy with user-provided init bytecode
    /// @param salt The CREATE2 salt for deterministic deployment
    /// @param bytecode The init bytecode for deployment
    /// @param constructorArgs Constructor arguments packed separately
    /// @return deployed Address of the deployed contract
    function deployDeterministic(
        bytes32 salt,
        bytes calldata bytecode,
        bytes calldata constructorArgs
    ) external payable returns (address deployed);

    /// @notice Batch deterministic deploy (fee * count)
    /// @param salts Array of CREATE2 salts for deterministic deployment
    /// @param bytecodes Array of init bytecodes for deployment
    /// @param constructorArgs Array of constructor arguments packed separately
    /// @return deployed Array of addresses of deployed contracts
    function deployDeterministicBatch(
        bytes32[] calldata salts,
        bytes[] calldata bytecodes,
        bytes[] calldata constructorArgs
    ) external payable returns (address[] memory deployed);

    // -------- Predictions / queries --------

    /// @notice Predict the chunk address and content hash for data (no state change)
    /// @param data The chunk data to predict address and hash for
    /// @return predicted Predicted address of the chunk
    /// @return hash Predicted keccak256 hash of the data
    function predict(bytes calldata data)
        external
        view
        returns (address predicted, bytes32 hash);

    /// @notice Predict a CREATE2 address given salt + code hash
    /// @param salt The CREATE2 salt used for deployment
    /// @param codeHash The code hash of the contract to be deployed
    /// @return predicted Predicted address of the deployed contract
    function predictAddress(bytes32 salt, bytes32 codeHash)
        external
        view
        returns (address predicted);

    /// @notice Batch prediction for multiple deployments
    /// @param salts Array of CREATE2 salts used for deployment
    /// @param codeHashes Array of code hashes of contracts to be deployed
    /// @return predicted Array of predicted addresses of deployed contracts
    function predictAddressBatch(
        bytes32[] calldata salts,
        bytes32[] calldata codeHashes
    ) external view returns (address[] memory predicted);

    /// @notice Read staged chunk contents (SSTORE2-style)
    /// @param chunk Address of the chunk to read
    /// @return The chunk data content
    function read(address chunk) external view returns (bytes memory);

    /// @notice Check if a chunk with this content hash already exists
    /// @param hash The content hash to check
    /// @return True if a chunk with this content hash exists
    function exists(bytes32 hash) external view returns (bool);

    /// @notice Validate init-code size (EIP-3860 safety)
    /// @param bytecode The bytecode to validate
    /// @return valid True if the bytecode size is valid according to EIP-3860
    function validateBytecodeSize(bytes calldata bytecode)
        external
        pure
        returns (bool valid);

    /// @notice Integrity probe against expected dispatcher/factory codehashes
    /// @return True if system integrity is verified
    function verifySystemIntegrity() external view returns (bool);

    // -------- Public getters --------

    /// @notice Get the total number of deployments
    /// @return The count of deployments
    function deploymentCount() external view returns (uint256);

    /// @notice Get the tier level for a user
    /// @param user The user address to check
    /// @return The tier level of the user
    function userTiers(address user) external view returns (uint8);

    /// @notice Check if an address is a deployed contract
    /// @param target The address to check
    /// @return True if the address is a deployed contract
    function isDeployedContract(address target) external view returns (bool);

    /// @notice Get the owner of the factory
    /// @return The owner address
    function owner() external view returns (address);

    // -------- Funds / control --------

    /// @notice Withdraw collected fees to the fee recipient
    function withdrawFees() external;

    /// @notice Withdraw any overpayment refunds accrued by the caller
    function withdrawRefund() external;

    // -------- Admin setters --------

    /// @notice Set the fee for a specific tier
    /// @param tier The tier level to set the fee for
    /// @param fee The fee amount to set
    function setTierFee(uint8 tier, uint256 fee) external;

    /// @notice Set the tier for a specific user
    /// @param user The user address to set the tier for
    /// @param tier The tier level to set
    function setUserTier(address user, uint8 tier) external;

    /// @notice Enable or disable idempotent mode
    /// @param enabled True to enable idempotent mode, false to disable
    function setIdempotentMode(bool enabled) external;

    /// @notice Set the fee recipient address
    /// @param newRecipient The new fee recipient address
    function setFeeRecipient(address newRecipient) external;

    /// @notice Set the base fee in wei
    /// @param newBase The new base fee amount in wei
    function setBaseFeeWei(uint256 newBase) external;

    /// @notice Enable or disable fee collection
    /// @param enabled True to enable fee collection, false to disable
    function setFeesEnabled(bool enabled) external;

    /// @notice Transfer default admin role to a new address
    /// @param newAdmin The new admin address
    function transferDefaultAdmin(address newAdmin) external;

    // -------- Events --------

    /// @notice Emitted when a chunk is staged
    event ChunkStaged(address indexed chunk, bytes32 indexed hash, bytes32 salt, uint256 size);

    /// @notice Emitted when multiple chunks are staged in a batch
    event BatchStaged(uint256 chunkCount, uint256 gasUsed, bytes32 packedMetadata, uint256 timestamp);

    /// @notice Emitted when a contract is deployed
    event ContractDeployed(
        address indexed deployed,
        bytes32 indexed salt,
        address indexed deployer,
        uint256 fee
    );

    /// @notice Emitted when multiple contracts are deployed in a batch
    event BatchDeployed(
        address[] deployed,
        bytes32[] salts,
        address indexed deployer,
        uint256 totalFee
    );

    /// @notice Emitted when fees are withdrawn
    event FeesWithdrawn(address indexed recipient, uint256 amount);

    /// @notice Emitted when fee collection fails
    event FeeCollectionFailed(address indexed collector, uint256 amount);

    /// @notice Emitted when a tier fee is set
    event TierFeeSet(uint8 indexed tier, uint256 fee);

    /// @notice Emitted when a user tier is set
    event UserTierSet(address indexed user, uint8 tier);

    /// @notice Emitted when idempotent mode is set
    event IdempotentModeSet(bool enabled);

    /// @notice Emitted when the fee recipient is changed
    event FeeRecipientSet(address indexed newRecipient);

    /// @notice Emitted when the base fee is changed
    event BaseFeeSet(uint256 newBaseFee);

    /// @notice Emitted when fee collection is enabled or disabled
    event FeesEnabledSet(bool enabled);

    /// @notice Emitted when the default admin is transferred
    event DefaultAdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    /// @notice Emitted during emergency withdrawal
    event EmergencyWithdrawal(address indexed recipient, uint256 amount);
}
