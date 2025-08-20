// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PayRoxAccessControlStorage as ACS} from "../libraries/PayRoxAccessControlStorage.sol";
import {PayRoxPauseStorage as PS} from "../libraries/PayRoxPauseStorage.sol";
import {IChunkFactory}   from "../interfaces/IChunkFactory.sol";
import {IManifestDispatcher} from "../interfaces/IManifestDispatcher.sol";
import {ChunkFactoryLib} from "../utils/ChunkFactoryLib.sol";

/// @title DeterministicChunkFactory
/// @notice Size-optimized version using library delegation
/// @dev Maintains full IChunkFactory interface while staying under EIP-170 limit
contract DeterministicChunkFactory is IChunkFactory, ReentrancyGuard {
    // Custom errors used in constructor and validations
    error ZeroAddress();
    error InvalidConstructorArgs();

    address public defaultAdmin;

    modifier onlyOwner() {
        require(ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][msg.sender], "Not owner");
        _;
    }

    modifier onlyRole(bytes32 role) {
        require(ACS.layout().roles[role][msg.sender], "Missing role");
        _;
    }

    modifier whenNotPaused() {
        require(!PS.layout().paused, "Pausable: paused");
        _;
    }

    function owner() public view returns (address) {
        return defaultAdmin;
    }

    /// @notice owner() returns the informational default admin address.
    /// @dev Access control checks in this contract use ACS roles (see `PayRoxAccessControlStorage`).
    ///      `owner()` is retained for compatibility/visibility only and should not be relied on for
    ///      authorization decisions (use ACS roles instead).
    

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ROLES & CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant FEE_ROLE      = keccak256("FEE_ROLE");
    uint256 public constant MAX_CHUNK_BYTES = 24_000;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    address public feeRecipient;
    uint256 public baseFeeWei;
    bool    public feesEnabled;
    bool    public idempotentMode = true;

    mapping(bytes32 => address) public chunkOf;
    uint256 public deploymentCount;
    mapping(address => bool) public isDeployedContract;
    mapping(uint8 => uint256) public tierFees;
    mapping(address => uint8) public userTiers;

    // System integrity variables
    address public immutable expectedManifestDispatcher;
    bytes32 public immutable expectedManifestHash;
    bytes32 public immutable expectedDispatcherCodehash;    // NEW: separate dispatcher codehash
    bytes32 public immutable expectedFactoryBytecodeHash;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    constructor(
        address _feeRecipient,
        address _manifestDispatcher,
        bytes32 _manifestHash,            // manifest root
        bytes32 _dispatcherCodehash,      // dispatcher EXTCODEHASH
        bytes32 _factoryBytecodeHash,
        uint256 _baseFeeWei,
        bool _feesEnabled
    ) {
        // Validate constructor arguments
        if (_feeRecipient == address(0)) revert ZeroAddress();
        if (_manifestDispatcher == address(0)) revert ZeroAddress();
        if (_manifestHash == bytes32(0)) revert InvalidConstructorArgs();
        if (_dispatcherCodehash == bytes32(0)) revert InvalidConstructorArgs();
        if (_factoryBytecodeHash == bytes32(0)) revert InvalidConstructorArgs();

    // Seed canonical role storage
    ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][msg.sender] = true;
    ACS.layout().roles[OPERATOR_ROLE][msg.sender] = true;
    ACS.layout().roles[FEE_ROLE][msg.sender] = true;
        defaultAdmin = msg.sender;

        feeRecipient = _feeRecipient;
        expectedManifestDispatcher = _manifestDispatcher;
        expectedManifestHash = _manifestHash;
        expectedDispatcherCodehash = _dispatcherCodehash;    // NEW
        expectedFactoryBytecodeHash = _factoryBytecodeHash;
        baseFeeWei = _baseFeeWei;
        feesEnabled = _feesEnabled;
    }

    // -----------------------------
    // Runtime Invariant Checklist
    // -----------------------------
    // These succinct invariants are useful for CI checks and audits:
    // 1) Mismatch dispatcher/codehash/root -> all state-changing creators (stage*/deploy*) revert with
    //    "System integrity check failed" via `_verifySystemIntegrity()`.
    // 2) When `feesEnabled == false` and `msg.value > 0`, the helpers auto-refund the caller and
    //    return early; the factory's ETH balance must remain unchanged by these operations.
    // 3) `deployDeterministicBatch` charges per-slot (even when an idempotent slot is a no-op). If this
    //    is the intended billing model, call sites should be aware; see the `deployDeterministicBatch`
    //    docstring for details. On idempotent hits the predicted address is returned, no CREATE2 is executed,
    //    and `isDeployedContract[predicted]` is set to true to maintain view parity.
    // 4) Successful fee push leaves factory balance at zero (fees forwarded to `feeRecipient`). On failed
    //    push, `FeeCollectionFailed` is emitted and funds remain withdrawable via `withdrawFees()` by
    //    `feeRecipient`.


    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CORE FUNCTIONS (DELEGATED TO LIBRARY)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    function stage(bytes calldata data) external payable nonReentrant whenNotPaused returns (address chunk, bytes32 hash) {
        return _stageInternal(data);
    }

    function stageMany(bytes[] calldata dataArray) external payable nonReentrant whenNotPaused returns (address[] memory chunks) {
        chunks = new address[](dataArray.length);

        // Collect batch fee once
        _collectBatchFee(dataArray.length);

        for (uint256 i = 0; i < dataArray.length; i++) {
            (chunks[i], ) = _stageInternalNoFee(dataArray[i]);
        }
    }

    function stageBatch(bytes[] calldata blobs) external payable nonReentrant whenNotPaused returns (address[] memory chunks, bytes32[] memory hashes) {
        chunks = new address[](blobs.length);
        hashes = new bytes32[](blobs.length);

        // Collect batch fee once
        _collectBatchFee(blobs.length);

        for (uint256 i = 0; i < blobs.length; i++) {
            (chunks[i], hashes[i]) = _stageInternalNoFee(blobs[i]);
        }
    }

    function _stageInternal(bytes calldata data) internal returns (address chunk, bytes32 hash) {
        // PERFECT_CEI_PATTERN: Complete Checks-Effects-Interactions

        // ═══ CHECKS PHASE ═══
        require(_verifySystemIntegrity(), "System integrity check failed");
        bytes memory dataMemory = data;
        require(data.length <= MAX_CHUNK_BYTES, "DeterministicChunkFactory: chunk exceeds size limit");
        require(ChunkFactoryLib.validateData(dataMemory), "DeterministicChunkFactory: invalid chunk data");

        bytes32 salt = ChunkFactoryLib.computeSalt(data);
        hash = keccak256(data);

        // Idempotent check (read-only, no state changes)
        if (idempotentMode && chunkOf[hash] != address(0)) {
            return (chunkOf[hash], hash);
        }

        // Prepare all deployment data
        bytes memory initCode = ChunkFactoryLib.createInitCode(data);
        require(ChunkFactoryLib.validateBytecodeSize(initCode), "Invalid bytecode size");
        bytes32 initCodeHash = keccak256(initCode);
        address predicted = ChunkFactoryLib.predictAddress(address(this), salt, initCodeHash);
        require(predicted != address(0), "DeterministicChunkFactory: invalid predicted address");

        // ═══ EFFECTS PHASE ═══
        // Deploy the contract first
        address deployedChunk;
        assembly {
            deployedChunk := create2(0, add(initCode, 0x20), mload(initCode), salt)
            if iszero(deployedChunk) { revert(0, 0) }
        }
        require(deployedChunk == predicted, "DeterministicChunkFactory: deployment address mismatch");

        // Update ALL state variables BEFORE external interactions
        chunkOf[hash] = deployedChunk;
        isDeployedContract[deployedChunk] = true;
        deploymentCount++;
        chunk = deployedChunk;

        // ═══ INTERACTIONS PHASE ═══
        // External calls LAST to prevent reentrancy
        _collectProtocolFee();

        // Emit event (safe external interaction)
        emit ChunkStaged(chunk, hash, salt, data.length);

        return (chunk, hash);
    }

    function deployDeterministic(
        bytes32 salt,
        bytes calldata bytecode,
        bytes calldata constructorArgs
    ) external payable nonReentrant whenNotPaused returns (address deployed) {
    require(_verifySystemIntegrity(), "System integrity check failed");
        _collectFee();

        // Combine bytecode and constructor args into init code
        bytes memory initCode = abi.encodePacked(bytecode, constructorArgs);
        require(ChunkFactoryLib.validateBytecodeSize(initCode), "Invalid bytecode size");

        bytes32 codeHash = keccak256(initCode);
        deployed = ChunkFactoryLib.predictAddress(address(this), salt, codeHash);

        // Check if already deployed
        if (deployed.code.length > 0) {
            if (idempotentMode) {
                return deployed;
            } else {
                revert("Already deployed");
            }
        }

        assembly {
            deployed := create2(0, add(initCode, 0x20), mload(initCode), salt)
            if iszero(deployed) {
                let size := returndatasize()
                if size {
                    let ptr := mload(0x40)
                    returndatacopy(ptr, 0, size)
                    revert(ptr, size)
                }
                revert(0, 0)
            }
        }

        require(deployed == ChunkFactoryLib.predictAddress(address(this), salt, codeHash), "Deployment address mismatch");

        isDeployedContract[deployed] = true;
        deploymentCount++;

        emit ContractDeployed(deployed, salt, msg.sender, _getDeploymentFee(msg.sender));
    }

    function deployDeterministicBatch(
        bytes32[] calldata salts,
        bytes[] calldata bytecodes,
        bytes[] calldata constructorArgs
    ) external payable nonReentrant whenNotPaused returns (address[] memory deployed) {
        require(salts.length == bytecodes.length && bytecodes.length == constructorArgs.length, "Array length mismatch");
    require(_verifySystemIntegrity(), "System integrity check failed");

        deployed = new address[](salts.length);
    // Billing note: this batch API charges per-slot (msg.sender pays _getDeploymentFee(msg.sender) * salts.length)
    // even if some slots are idempotent hits (no CREATE2). This is intentional for the current pricing model.
    uint256 totalFee = _getDeploymentFee(msg.sender) * salts.length;
    require(msg.value >= totalFee, "Insufficient fee");

        // Forward fee immediately (consistent with push policy)
        if (totalFee > 0) {
            (bool success, ) = payable(feeRecipient).call{value: totalFee}("");
            if (!success) {
                emit FeeCollectionFailed(feeRecipient, totalFee);
            }
        }

        for (uint256 i = 0; i < salts.length; i++) {
            bytes memory initCode = abi.encodePacked(bytecodes[i], constructorArgs[i]);
            require(ChunkFactoryLib.validateBytecodeSize(initCode), "Invalid bytecode size");

            bytes32 codeHash = keccak256(initCode);
            address predicted = ChunkFactoryLib.predictAddress(address(this), salts[i], codeHash);

            if (predicted.code.length > 0 && idempotentMode) {
                deployed[i] = predicted;
                isDeployedContract[predicted] = true; // Fix: maintain view consistency
                continue;
            }

            bytes32 currentSalt = salts[i];
            assembly {
                let result := create2(0, add(initCode, 0x20), mload(initCode), currentSalt)
                if iszero(result) {
                    let size := returndatasize()
                    if size {
                        let ptr := mload(0x40)
                        returndatacopy(ptr, 0, size)
                        revert(ptr, size)
                    }
                    revert(0, 0)
                }
                mstore(add(add(deployed, 0x20), mul(i, 0x20)), result)
            }

            isDeployedContract[deployed[i]] = true;
            deploymentCount++;
        }

        // Refund excess
        if (msg.value > totalFee) {
            (bool success, ) = msg.sender.call{value: msg.value - totalFee}("");
            require(success, "Refund failed");
        }

        emit BatchDeployed(deployed, salts, msg.sender, totalFee);
    }

    function predict(bytes calldata data) external view returns (address predicted, bytes32 hash) {
        hash = keccak256(data);
        bytes32 salt = ChunkFactoryLib.computeSalt(data);
        bytes memory initCode = ChunkFactoryLib.createInitCode(data);
        bytes32 initCodeHash = keccak256(initCode);
        predicted = ChunkFactoryLib.predictAddress(address(this), salt, initCodeHash);
    }

    function predictAddressBatch(
        bytes32[] calldata salts,
        bytes32[] calldata codeHashes
    ) external view returns (address[] memory predicted) {
        require(salts.length == codeHashes.length, "Array length mismatch");
        predicted = new address[](salts.length);

        for (uint256 i = 0; i < salts.length; i++) {
            predicted[i] = ChunkFactoryLib.predictAddress(address(this), salts[i], codeHashes[i]);
        }
    }

    function read(address chunk) external view returns (bytes memory) {
        return ChunkFactoryLib.readChunk(chunk);
    }

    function exists(bytes32 hash) external view returns (bool) {
        return chunkOf[hash] != address(0);
    }

    function predictAddress(bytes32 salt, bytes32 codeHash) public view returns (address) {
        return ChunkFactoryLib.predictAddress(address(this), salt, codeHash);
    }

    function validateBytecodeSize(bytes calldata bytecode) public pure returns (bool) {
        bytes memory bytecodeMemory = bytecode;
        return ChunkFactoryLib.validateBytecodeSize(bytecodeMemory);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // SIMPLE GETTERS & SETTERS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    function getDeploymentFee() external view returns (uint256) {
        return _getDeploymentFee(msg.sender);
    }

    function getDeploymentCount() external view returns (uint256) {
        return deploymentCount;
    }

    function isDeployed(address target) external view returns (bool) {
        return isDeployedContract[target];
    }

    function getUserTier(address user) external view returns (uint8) {
        return userTiers[user];
    }

    function setTierFee(uint8 tier, uint256 fee) external onlyRole(FEE_ROLE) {
        tierFees[tier] = fee;
        emit TierFeeSet(tier, fee);
    }

    function setUserTier(address user, uint8 tier) external onlyRole(FEE_ROLE) {
        userTiers[user] = tier;
        emit UserTierSet(user, tier);
    }

    function setIdempotentMode(bool enabled) external onlyRole(OPERATOR_ROLE) {
        idempotentMode = enabled;
        emit IdempotentModeSet(enabled);
    }

    function withdrawFees() external nonReentrant {
        require(msg.sender == feeRecipient, "Not fee recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        // This should only contain fees from failed pushes
        (bool success, ) = feeRecipient.call{value: balance}("");
        require(success, "Transfer failed");

        emit FeesWithdrawn(feeRecipient, balance);
    }

    // Added to satisfy new interface; current implementation uses immediate refunds
    function withdrawRefund() external nonReentrant {
        revert("No refund available");
    }

    function verifySystemIntegrity() external view returns (bool) {
        return _verifySystemIntegrity();
    }

    function getExpectedManifestHash() external view returns (bytes32) {
        return expectedManifestHash;
    }

    function getExpectedDispatcherCodehash() external view returns (bytes32) {
        return expectedDispatcherCodehash;
    }

    function getExpectedFactoryBytecodeHash() external view returns (bytes32) {
        return expectedFactoryBytecodeHash;
    }

    function getManifestDispatcher() external view returns (address) {
        return expectedManifestDispatcher;
    }

    // Pause/unpause are provided by the canonical PauseFacet; remove local exposure to avoid selector collisions.

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    function _collectFee() internal {
        if (!feesEnabled) {
            // Lenient policy: auto-refund any ETH accidentally sent when fees are disabled
            if (msg.value > 0) {
                // Early refund and return for clarity: caller receives full refund, factory balance unchanged.
                (bool refundSuccess, ) = msg.sender.call{value: msg.value}("");
                require(refundSuccess, "Refund failed");
            }
            return; // explicit early return to highlight invariant for CI
        }

        uint256 fee = _getDeploymentFee(msg.sender);
        require(msg.value >= fee, "Insufficient fee");

        // Forward fee immediately (consistent with _collectProtocolFee)
        if (fee > 0) {
            (bool success, ) = payable(feeRecipient).call{value: fee}("");
            if (!success) {
                emit FeeCollectionFailed(feeRecipient, fee);
            }
        }

        if (msg.value > fee) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - fee}("");
            require(refundSuccess, "Refund failed");
        }
    }

    function _collectProtocolFee() internal {
        if (!feesEnabled) {
            // Auto-refund accidental ETH when fees are disabled
            if (msg.value > 0) {
                // Early refund and return for clarity: caller receives full refund, factory balance unchanged.
                (bool refundSuccess, ) = msg.sender.call{value: msg.value}("");
                require(refundSuccess, "Refund failed");
            }
            return; // explicit early return to highlight invariant for CI
        }

        uint256 fee = _getDeploymentFee(msg.sender);
        require(msg.value >= fee, "Insufficient fee");

        if (fee > 0) {
            (bool success, ) = payable(feeRecipient).call{value: fee}("");
            if (!success) {
                emit FeeCollectionFailed(feeRecipient, fee);
            }
        }

        if (msg.value > fee) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - fee}("");
            require(refundSuccess, "Refund failed");
        }
    }

    function _getDeploymentFee(address user) internal view returns (uint256) {
        if (!feesEnabled) return 0;

        uint8 tier = userTiers[user];
        uint256 tierFee = tierFees[tier];

        return tierFee > 0 ? tierFee : baseFeeWei;
    }

    /// @notice Collect fee for batch operations
    function _collectBatchFee(uint256 count) internal {
        if (!feesEnabled) {
            // Auto-refund accidental ETH when fees are disabled
            if (msg.value > 0) {
                // Early refund and return for clarity: caller receives full refund, factory balance unchanged.
                (bool refundSuccess, ) = msg.sender.call{value: msg.value}("");
                require(refundSuccess, "Refund failed");
            }
            return; // explicit early return to highlight invariant for CI
        }

        uint256 totalFee = _getDeploymentFee(msg.sender) * count;
        require(msg.value >= totalFee, "Insufficient fee for batch");

        // Forward fee immediately (consistent with push policy)
        if (totalFee > 0) {
            (bool success, ) = payable(feeRecipient).call{value: totalFee}("");
            if (!success) {
                emit FeeCollectionFailed(feeRecipient, totalFee);
            }
        }

        if (msg.value > totalFee) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalFee}("");
            require(refundSuccess, "Refund failed");
        }
    }

    /// @notice Internal staging without fee collection (for batch operations)
    function _stageInternalNoFee(bytes calldata data) internal returns (address chunk, bytes32 hash) {
        require(_verifySystemIntegrity(), "System integrity check failed");
        bytes memory dataMemory = data;
        require(data.length <= MAX_CHUNK_BYTES, "Invalid data size");
        require(ChunkFactoryLib.validateData(dataMemory), "Invalid data");

        bytes32 salt = ChunkFactoryLib.computeSalt(data);
        hash = keccak256(data);

        if (idempotentMode && chunkOf[hash] != address(0)) {
            return (chunkOf[hash], hash);
        }

        bytes memory initCode = ChunkFactoryLib.createInitCode(data);
        require(ChunkFactoryLib.validateBytecodeSize(initCode), "Invalid bytecode size");
        bytes32 initCodeHash = keccak256(initCode);

        address predicted = ChunkFactoryLib.predictAddress(address(this), salt, initCodeHash);

        assembly {
            chunk := create2(0, add(initCode, 0x20), mload(initCode), salt)
            if iszero(chunk) { revert(0, 0) }
        }

        require(chunk == predicted, "Address mismatch");

        chunkOf[hash] = chunk;
        isDeployedContract[chunk] = true;
        deploymentCount++;

        emit ChunkStaged(chunk, hash, salt, data.length);
    }

    function _verifySystemIntegrity() internal view returns (bool) {
        if (expectedManifestDispatcher != address(0)) {
            // 1) Dispatcher codehash gate
            if (expectedDispatcherCodehash != bytes32(0)) {
                if (expectedManifestDispatcher.codehash != expectedDispatcherCodehash) return false;
            }
            // 2) Manifest root gate (ask dispatcher)
            try IManifestDispatcher(expectedManifestDispatcher).activeRoot() returns (bytes32 root) {
                if (expectedManifestHash != bytes32(0) && root != expectedManifestHash) return false;
            } catch {
                return false;
            }
        }
        // 3) Factory self-hash gate
        if (expectedFactoryBytecodeHash != bytes32(0)) {
            if (address(this).codehash != expectedFactoryBytecodeHash) return false;
        }
        return true;
    }

    /**
     * @dev Emergency function to withdraw locked Ether
     * @notice Only callable by admin when contract is paused
     */
    function emergencyWithdraw() external nonReentrant {
        require(ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][msg.sender], "Not owner");
        require(PS.layout().paused, "Not paused");
        uint256 balance = address(this).balance;
        require(balance > 0, "No Ether to withdraw");
        
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Withdraw failed");
        
    emit EmergencyWithdrawal(msg.sender, balance);
    }

    function setFeeRecipient(address newRecipient) external onlyRole(FEE_ROLE) {
        if (newRecipient == address(0)) revert ZeroAddress();
        feeRecipient = newRecipient;
        emit FeeRecipientSet(newRecipient);
    }

    function setBaseFeeWei(uint256 newBase) external onlyRole(FEE_ROLE) {
        baseFeeWei = newBase;
        emit BaseFeeSet(newBase);
    }

    function setFeesEnabled(bool enabled) external onlyRole(FEE_ROLE) {
        feesEnabled = enabled;
        emit FeesEnabledSet(enabled);
    }

    function transferDefaultAdmin(address newAdmin) external {
        require(ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][msg.sender], "Missing role");
        if (newAdmin == address(0)) revert ZeroAddress();
        address prev = defaultAdmin;
        ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][newAdmin] = true;
        ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][prev] = false;
        defaultAdmin = newAdmin;
    }
}
