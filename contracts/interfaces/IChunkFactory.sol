// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Interface aligned to DeterministicChunkFactory v2 surface (Option A).
interface IChunkFactory {
    // -------- Core staging / deploying --------

    /// Stage a single chunk; returns deployed chunk address and keccak256(data).
    function stage(bytes calldata data)
        external
        payable
        returns (address chunk, bytes32 hash);

    /// Stage many chunks; fee charged per item; returns deployed chunk addresses.
    function stageMany(bytes[] calldata dataArray)
        external
        payable
        returns (address[] memory chunks);

    /// Stage many chunks and also return content hashes; emits BatchStaged with packed metadata.
    function stageBatch(bytes[] calldata blobs)
        external
        payable
        returns (address[] memory chunks, bytes32[] memory hashes);

    /// Deterministic deploy with user-provided init bytecode (+ constructor args packed separately).
    function deployDeterministic(
        bytes32 salt,
        bytes calldata bytecode,
        bytes calldata constructorArgs
    ) external payable returns (address deployed);

    /// Batch deterministic deploy (fee * count).
    function deployDeterministicBatch(
        bytes32[] calldata salts,
        bytes[] calldata bytecodes,
        bytes[] calldata constructorArgs
    ) external payable returns (address[] memory deployed);

    // -------- Predictions / queries --------

    /// Predict the chunk address and content hash for `data` (no state change).
    function predict(bytes calldata data)
        external
        view
        returns (address predicted, bytes32 hash);

    /// Predict a CREATE2 address given salt + code hash.
    function predictAddress(bytes32 salt, bytes32 codeHash)
        external
        view
        returns (address predicted);

    /// Batch prediction for multiple deployments.
    function predictAddressBatch(
        bytes32[] calldata salts,
        bytes32[] calldata codeHashes
    ) external view returns (address[] memory predicted);

    /// Read staged chunk contents (SSTORE2-style).
    function read(address chunk) external view returns (bytes memory);

    /// True if a chunk with this content hash already exists.
    function exists(bytes32 hash) external view returns (bool);

    /// Validate init-code size (EIP-3860 safety).
    function validateBytecodeSize(bytes calldata bytecode)
        external
        pure
        returns (bool valid);

    /// Integrity probe against expected dispatcher/factory codehashes.
    function verifySystemIntegrity() external view returns (bool);

    // -------- Public getters exposed by state variables in v2 --------

    function deploymentCount() external view returns (uint256);
    function userTiers(address user) external view returns (uint8);
    function isDeployedContract(address target) external view returns (bool);

    // Convenience owner getter provided by v2
    function owner() external view returns (address);

    // -------- Funds / control --------

    /// Fee recipient pulls collected fees.
    function withdrawFees() external;

    /// Caller pulls any overpayment refunds accrued.
    function withdrawRefund() external;

    /// Pause / unpause (role-gated in implementation).
    function pause() external;
    function unpause() external;

    // -------- Admin setters present in v2 (role-gated there) --------

    function setTierFee(uint8 tier, uint256 fee) external;
    function setUserTier(address user, uint8 tier) external;
    function setIdempotentMode(bool enabled) external;

    function setFeeRecipient(address newRecipient) external;
    function setBaseFeeWei(uint256 newBase) external;
    function setFeesEnabled(bool enabled) external;
    function setMaxSingleTransfer(uint256 newMax) external;

    function transferDefaultAdmin(address newAdmin) external;
    function addAuthorizedRecipient(address recipient) external;
    function removeAuthorizedRecipient(address recipient) external;

    // -------- Events emitted by v2 --------

    event ChunkStaged(address indexed chunk, bytes32 indexed hash, bytes32 salt, uint256 size);
    event BatchStaged(uint256 chunkCount, uint256 gasUsed, bytes32 packedMetadata, uint256 timestamp);

    event ContractDeployed(
        address indexed deployed,
        bytes32 indexed salt,
        address indexed deployer,
        uint256 fee
    );

    event BatchDeployed(
        address[] deployed,
        bytes32[] salts,
        address indexed deployer,
        uint256 totalFee
    );

    event FeesWithdrawn(address indexed recipient, uint256 amount);
    event FeeCollectionFailed(address indexed collector, uint256 amount);

    event TierFeeSet(uint8 indexed tier, uint256 fee);
    event UserTierSet(address indexed user, uint8 tier);
    event IdempotentModeSet(bool enabled);

    event FeeRecipientSet(address indexed newRecipient);
    event BaseFeeSet(uint256 newBaseFee);
    event FeesEnabledSet(bool enabled);

    event AuthorizedRecipientAdded(address indexed recipient);
    event AuthorizedRecipientRemoved(address indexed recipient);

    event DefaultAdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    event EmergencyWithdrawal(address indexed recipient, uint256 amount);
}
