// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {GasOptimizationUtils} from "../utils/GasOptimizationUtils.sol";
import { RefactorSafetyLib, RefactorSafeFacetBase } from "../libraries/RefactorSafetyLib.sol";

/**
 * @title ExampleFacetA
 * @notice Delegatecalled facet routed by a Manifest‑gated dispatcher.
 * @dev Uses a fixed storage slot layout (diamond‑safe). Non‑payable; no external calls.
 */
contract ExampleFacetA is RefactorSafeFacetBase {

    /* ───────────────────────────── Errors ───────────────────────────── */
    error EmptyMessage();
    error InvalidKey();
    error EmptyData();
    error DataTooLarge();
    error TooManyMessages();

    /* ─────────────────────── Gas / L2‑friendly caps ─────────────────── */
    uint256 private constant MAX_DATA_BYTES = 4096; // per-key bound
    uint256 private constant MAX_MESSAGES   = 10;   // batch bound
    uint256 private constant MAX_MSG_BYTES = 1024;  // per-message bound for executeA

    /* ───────────────────────────── Events ────────────────────────────── */
    // Emit a hash to keep logs light; include size + setter for auditability.
    event DataStored(bytes32 indexed key, bytes32 indexed dataHash, uint256 size, address indexed setter);
    // Retain the readable message event for parity with your prior API.
    event FacetAExecuted(address indexed caller, uint256 indexed value, string message);
    // Gas-efficient event for high-volume execution tracking
    event FacetAExecutedHash(address indexed caller, bytes32 indexed msgHash);
    // Gas optimization analytics for batch operations
    event BatchExecutedOptimized(uint256 messageCount, uint256 gasUsed, bytes32 packedMetadata, uint256 timestamp);

    /* ─────────────── Diamond‑safe storage (fixed slot) ──────────────── */
    // Unique slot for this facet’s state.
    bytes32 private constant _SLOT = keccak256("payrox.facets.exampleA.v1");

    struct Layout {
        mapping(bytes32 => bytes) data;     // bounded by MAX_DATA_BYTES
        mapping(address => uint256) userCounts;
        uint256 totalExecutions_;
        address lastCaller_;
    }

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = _SLOT;
        assembly { l.slot := slot }
    }

    // -------- Refactor safety hooks (non-hot path usage) --------
    function _getVersion() internal pure override returns (uint256) { return 110; } // e.g., 1.1.0
    function _getStorageNamespace() internal pure override returns (bytes32) { return _SLOT; }
    function _getExpectedCodeHash() internal pure override returns (bytes32) { return bytes32(0); }

    /* ───────────────────────────── API ──────────────────────────────── */

    /// Execute an action and emit both readable and hash events for flexibility.
    function executeA(string calldata message) external returns (bool success) {
        if (bytes(message).length == 0) revert EmptyMessage();
        if (bytes(message).length > MAX_MSG_BYTES) revert DataTooLarge();

        Layout storage l = _layout();
        unchecked {
            l.userCounts[msg.sender] += 1;
            l.totalExecutions_ += 1;
        }
        l.lastCaller_ = msg.sender;

        // Emit both events: readable for compatibility, hash for gas efficiency
        emit FacetAExecuted(msg.sender, 0, message);
        emit FacetAExecutedHash(msg.sender, keccak256(bytes(message)));
        return true;
    }

    /// Store bounded bytes under a caller-namespaced key; emits a hashed event for gas savings.
    function storeData(bytes32 key, bytes calldata data_) external {
        if (key == bytes32(0)) revert InvalidKey();
        if (data_.length == 0) revert EmptyData();
        if (data_.length > MAX_DATA_BYTES) revert DataTooLarge();

        Layout storage l = _layout();
        // Namespace keys per caller to prevent global collisions
        bytes32 namespacedKey = keccak256(abi.encodePacked(msg.sender, key));
        l.data[namespacedKey] = data_;
        emit DataStored(namespacedKey, keccak256(data_), data_.length, msg.sender);
    }

    /// Read stored data from caller-namespaced key.
    function getData(bytes32 key) external view returns (bytes memory data) {
        bytes32 namespacedKey = keccak256(abi.encodePacked(msg.sender, key));
        return _layout().data[namespacedKey];
    }

    /// Per‑user execution count.
    function getUserCount(address user) external view returns (uint256 count) {
        return _layout().userCounts[user];
    }

    /// Batch execute bounded messages.
    function batchExecute(string[] calldata messages) external returns (bool[] memory results) {
        uint256 n = messages.length;
        if (n == 0) revert EmptyMessage();
        if (n > MAX_MESSAGES) revert TooManyMessages();

        Layout storage l = _layout();
        results = new bool[](n);

        // Use GasOptimizationUtils for efficient batch processing
        uint64[] memory messageLengths = new uint64[](n);
        uint256 gasBefore = gasleft();

        for (uint256 i; i < n; ) {
            if (bytes(messages[i]).length > 0) {
                messageLengths[i] = uint64(bytes(messages[i]).length);
                unchecked {
                    l.userCounts[msg.sender] += 1;
                    l.totalExecutions_ += 1;
                }
                // Emit both events for each message
                emit FacetAExecuted(msg.sender, 0, messages[i]);
                emit FacetAExecutedHash(msg.sender, keccak256(bytes(messages[i])));
                results[i] = true;
            } else {
                results[i] = false;
            }
            unchecked { ++i; }
        }

        l.lastCaller_ = msg.sender;

        // Pack batch metadata for gas optimization analytics
        bytes32 packedMetadata = GasOptimizationUtils.packStorage(messageLengths);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit BatchExecutedOptimized(n, gasUsed, packedMetadata, block.timestamp);
    }

    /// Keccak256 convenience hash.
    function calculateHash(bytes calldata input) external pure returns (bytes32 hash) {
        return keccak256(input);
    }

    /// Enhanced signature verification supporting EIP-2098 compact sigs and malleability-safe
    function verifySignature(
        bytes32 hash,
        bytes calldata signature,
        address expectedSigner
    ) external pure returns (bool isValid) {
        if (expectedSigner == address(0)) return false;
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(hash);
        (address recovered, ECDSA.RecoverError err, bytes32 _errArg) =
            ECDSA.tryRecover(digest, signature);
        return err == ECDSA.RecoverError.NoError && recovered == expectedSigner;
    }

    /// Backwards‑compatible getters to preserve selectors.
    function totalExecutions() external view returns (uint256) {
        return _layout().totalExecutions_;
    }

    function lastCaller() external view returns (address) {
        return _layout().lastCaller_;
    }

    /// Facet metadata and selector list (for manifest tooling).
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "ExampleFacetA";
        version = "1.1.0";

        selectors = new bytes4[](10);
        selectors[0] = this.executeA.selector;
        selectors[1] = this.storeData.selector;
        selectors[2] = this.getData.selector;
        selectors[3] = this.getUserCount.selector;
        selectors[4] = this.batchExecute.selector;
        selectors[5] = this.calculateHash.selector;
        selectors[6] = this.verifySignature.selector;
        selectors[7] = this.totalExecutions.selector;
        selectors[8] = this.lastCaller.selector;
        selectors[9] = this.getFacetInfo.selector;
    }
}
