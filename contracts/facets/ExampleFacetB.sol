// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import { RefactorSafetyLib, RefactorSafeFacetBase } from "../libraries/RefactorSafetyLib.sol";

/**
 * @title ExampleFacetB
 * @notice Delegatecalled facet to be routed by a Manifest‑gated dispatcher.
 * @dev Diamond‑safe storage (fixed slot), L2‑friendly bounds, no external calls.
 */
contract ExampleFacetB is RefactorSafeFacetBase {
    /* ───────────────────────────── Errors ───────────────────────────── */
    error Paused();
    error InvalidOperationType();
    error EmptyData();
    error DataTooLarge();
    error TooManyOperations();
    error EmptyBatch();
    error LengthMismatch();
    error NotOperator();
    error AlreadyInitialized();
    error NotInitialized();
    error ZeroAddress();
    error InvalidInitSignature();
    error ExpiredSignature();

    /* ─────────── Gas / L2‑friendly caps & constants ─────────── */
    uint256 private constant MAX_OPERATION_TYPE = 5;     // valid types: 1..5
    uint256 private constant MAX_BATCH          = 20;    // per-call ops bound
    uint256 private constant MAX_DATA_BYTES     = 1024;  // bound op payload
    uint256 private constant MAX_USER_OPS       = 256;   // ring buffer size

    /* ───────────────────────── EIP-712 Constants ──────────────────────── */
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 private constant INIT_TYPEHASH = keccak256(
        "InitializeFacetB(address operator,address governance,uint256 deadline,uint256 nonce)"
    );

    bytes32 private constant ROTATE_GOVERNANCE_TYPEHASH = keccak256(
        "RotateGovernance(address newGovernance,uint256 deadline,uint256 nonce)"
    );

    bytes32 private constant ROTATE_OPERATOR_TYPEHASH = keccak256(
        "RotateOperator(address newOperator,uint256 deadline,uint256 nonce)"
    );

    /* ───────────────────────────── Events ───────────────────────────── */
    event FacetBExecuted(address indexed caller, uint256 indexed operationType, bytes32 indexed dataHash);
    event StateChanged(uint256 oldValue, uint256 newValue, address indexed changer);
    event BatchOperationCompleted(uint256 operationCount, uint256 successCount, address indexed executor);
    event PausedSet(bool paused, address indexed by);
    event Initialized(address operator);
    event GovernanceRotated(address indexed oldGovernance, address indexed newGovernance);
    event OperatorRotated(address indexed oldOperator, address indexed newOperator);

    /* ─────────────── Diamond‑safe storage (fixed slot) ─────────────── */
    // Unique slot for this facet’s state.
    bytes32 private constant _SLOT = keccak256("payrox.facets.exampleB.v1");

    struct OperationData {
        uint32  operationType;   // packed
        uint64  timestamp;       // packed
        address executor;        // packed with bool in same slot via Solidity
        bool    executed;        // packed
        bytes   data;            // separate slot (dynamic)
    }

    struct UserOpsRB {
        uint32 head;  // next write index
        uint32 size;  // number of filled entries (<= MAX_USER_OPS)
        mapping(uint256 => uint256) buf; // circular buffer of op types
    }

    struct Layout {
        // Core state
        uint256 currentValue;
        uint256 operationCounter;
        address lastExecutor;

        // Ops index & per‑user bounded history
        mapping(bytes32 => OperationData) operations;
        mapping(address => UserOpsRB) userOps;

        // Op controls
        bool    paused;
        address operator;        // can set paused
        bool    initialized;     // one‑time initializer guard
        uint256 initNonce;       // for EIP-712 replay protection
        address governance;      // configurable governance address
    }

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = _SLOT;
        assembly { l.slot := slot }
    }

    modifier whenNotPaused() {
        if (_layout().paused) revert Paused();
        _;
    }

    modifier whenInitialized() {
        if (!_layout().initialized) revert NotInitialized();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != _layout().operator) revert NotOperator();
        _;
    }

    // -------- Refactor safety hooks (non-hot path usage) --------
    function _getVersion() internal pure override returns (uint256) { return 120; } // e.g., 1.2.0
    function _getStorageNamespace() internal pure override returns (bytes32) { return _SLOT; }
    function _getExpectedCodeHash() internal pure override returns (bytes32) { return bytes32(0); }

    /* ───────────────────────────── Admin (init) ───────────────────────────── */
    /**
     * @notice One‑time initializer to set the facet operator (governance-signed).
     * @dev Requires EIP-712 signature from governance to prevent init takeover.
     * @param operator_ The operator address to set
     * @param governance_ The governance address to set (can be a Safe or contract)
     * @param deadline Signature expiry timestamp
     * @param signature EIP-712 signature from governance
     */
    function initializeFacetB(
        address operator_,
        address governance_,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (operator_ == address(0)) revert ZeroAddress();
        if (governance_ == address(0)) revert ZeroAddress();
        if (block.timestamp > deadline) revert ExpiredSignature();

        Layout storage l = _layout();
        if (l.initialized) revert AlreadyInitialized();

        // Verify EIP-712 signature from governance
        bytes32 domainSeparator = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256("PayRoxFacetB"),
                keccak256("1.2.0"),
                block.chainid,
                address(this)
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(INIT_TYPEHASH, operator_, governance_, deadline, l.initNonce)
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        // Security: Verify signature from governance (prevents init takeover)
        if (!SignatureChecker.isValidSignatureNow(governance_, digest, signature)) {
            revert InvalidInitSignature();
        }

        // Initialize state with signed parameters
        l.operator = operator_;
        l.governance = governance_;
        l.initialized = true;
        unchecked { l.initNonce += 1; } // Prevent replay

        emit Initialized(operator_);
    }

    /**
     * @notice Set pause state (operator‑gated).
     */
    function setPaused(bool paused_) external onlyOperator {
        _layout().paused = paused_;
        emit PausedSet(paused_, msg.sender);
    }

    /**
     * @notice Rotate governance address (governance-signed).
     * @dev Requires EIP-712 signature from current governance.
     * @param newGovernance The new governance address
     * @param deadline Signature expiry timestamp
     * @param signature EIP-712 signature from current governance
     */
    function rotateGovernance(
        address newGovernance,
        uint256 deadline,
        bytes calldata signature
    ) external whenInitialized {
        if (newGovernance == address(0)) revert ZeroAddress();
        if (block.timestamp > deadline) revert ExpiredSignature();

        Layout storage l = _layout();

        // Build EIP-712 digest
        bytes32 domainSeparator = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256("PayRoxFacetB"),
                keccak256("1.2.0"),
                block.chainid,
                address(this)
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(ROTATE_GOVERNANCE_TYPEHASH, newGovernance, deadline, l.initNonce)
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        // Verify signature from current governance
        if (!SignatureChecker.isValidSignatureNow(l.governance, digest, signature)) {
            revert InvalidInitSignature();
        }

        address oldGovernance = l.governance;
        l.governance = newGovernance;
        unchecked { l.initNonce += 1; } // Prevent replay

        emit GovernanceRotated(oldGovernance, newGovernance);
    }

    /**
     * @notice Rotate operator address (governance-signed).
     * @dev Requires EIP-712 signature from current governance.
     * @param newOperator The new operator address
     * @param deadline Signature expiry timestamp
     * @param signature EIP-712 signature from current governance
     */
    function rotateOperator(
        address newOperator,
        uint256 deadline,
        bytes calldata signature
    ) external whenInitialized {
        if (newOperator == address(0)) revert ZeroAddress();
        if (block.timestamp > deadline) revert ExpiredSignature();

        Layout storage l = _layout();

        // Build EIP-712 digest
        bytes32 domainSeparator = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256("PayRoxFacetB"),
                keccak256("1.2.0"),
                block.chainid,
                address(this)
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(ROTATE_OPERATOR_TYPEHASH, newOperator, deadline, l.initNonce)
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        // Verify signature from current governance
        if (!SignatureChecker.isValidSignatureNow(l.governance, digest, signature)) {
            revert InvalidInitSignature();
        }

        address oldOperator = l.operator;
        l.operator = newOperator;
        unchecked { l.initNonce += 1; } // Prevent replay

        emit OperatorRotated(oldOperator, newOperator);
    }

    /* ───────────────────────────── API ───────────────────────────── */

    /**
     * @dev Execute a stateful operation with bounded payload.
     * @return operationId The ID of the created operation.
     */
    function executeB(
        uint256 operationType,
        bytes calldata data
    ) external whenInitialized whenNotPaused returns (bytes32 operationId) {
        if (operationType == 0 || operationType > MAX_OPERATION_TYPE) revert InvalidOperationType();
        uint256 len = data.length;
        if (len == 0) revert EmptyData();
        if (len > MAX_DATA_BYTES) revert DataTooLarge();

        Layout storage l = _layout();

        // Increment first for a unique monotonic counter.
        unchecked { l.operationCounter += 1; }
        uint256 ctr = l.operationCounter;

        // Hash data once and reuse
        bytes32 dataHash = keccak256(data);

        // Stable ID (includes chainid + data hash for compactness).
        operationId = keccak256(
            abi.encodePacked(msg.sender, operationType, dataHash, block.chainid, ctr)
        );

        // Record operation (stores bounded payload).
        l.operations[operationId] = OperationData({
            operationType: uint32(operationType),
            timestamp: uint64(block.timestamp),
            executor: msg.sender,
            executed: true,
            data: data
        });

        // Per‑user bounded history via ring buffer.
        UserOpsRB storage rb = l.userOps[msg.sender];
        uint32 head = rb.head;
        rb.buf[head] = operationType;
        unchecked {
            head = (head + 1) % uint32(MAX_USER_OPS);
        }
        rb.head = head;
        if (rb.size < MAX_USER_OPS) {
            rb.size += 1;
        }
        
        emit FacetBExecuted(msg.sender, operationType, dataHash);
    }

    /**
     * @dev Batch execute multiple operations (bounded and gas‑aware).
     * @return results Array of operation IDs (0 if skipped due to invalid input).
     */
    function batchExecuteB(
        uint256[] calldata operations,
        bytes[] calldata dataArray
    ) external whenInitialized whenNotPaused returns (bytes32[] memory results) {
        uint256 n = operations.length;
        if (n == 0) revert EmptyBatch();
        if (n != dataArray.length) revert LengthMismatch();
        if (n > MAX_BATCH) revert TooManyOperations();

        results = new bytes32[](n);
        uint256 successCount = 0; // Initialize to prevent uninitialized variable warning

        Layout storage l = _layout();

        for (uint256 i; i < n; ) {
            uint256 op = operations[i];
            bytes calldata dat = dataArray[i];

            if (
                op > 0 &&
                op <= MAX_OPERATION_TYPE &&
                dat.length > 0 &&
                dat.length <= MAX_DATA_BYTES
            ) {
                // Inline the single‑call logic for gas: avoid external self‑calls.
                unchecked { l.operationCounter += 1; }
                uint256 ctr = l.operationCounter;

                // Hash data once per item
                bytes32 dHash = keccak256(dat);
                bytes32 operationId = keccak256(
                    abi.encodePacked(msg.sender, op, dHash, block.chainid, ctr)
                );

                l.operations[operationId] = OperationData({
                    operationType: uint32(op),
                    timestamp: uint64(block.timestamp),
                    executor: msg.sender,
                    executed: true,
                    data: dat
                });

                // Ring buffer write
                UserOpsRB storage rb = l.userOps[msg.sender];
                uint32 head = rb.head;
                rb.buf[head] = op;
                unchecked { head = (head + 1) % uint32(MAX_USER_OPS); }
                rb.head = head;
                if (rb.size < MAX_USER_OPS) {
                    rb.size += 1;
                }

                _applyOperation(op, dat, l);
                results[i] = operationId;
                successCount++;

                // Emit per-item event for detailed tracking
                emit FacetBExecuted(msg.sender, op, dHash);
            }
            unchecked { ++i; }
        }

        l.lastExecutor = msg.sender;
        emit BatchOperationCompleted(n, successCount, msg.sender);
    }

    /**
     * @dev Get operation details by ID.
     */
    function getOperation(bytes32 operationId)
        external
        view
        returns (OperationData memory operation)
    {
        return _layout().operations[operationId];
    }

    /**
     * @dev Return the caller’s recent operation types (bounded ring buffer).
     *      Returns most‑recent‑first order.
     */
    function getUserOperations(address user)
        external
        view
        returns (uint256[] memory operationTypes)
    {
        UserOpsRB storage rb = _layout().userOps[user];

        uint256 sz = rb.size;
        operationTypes = new uint256[](sz);
        if (sz == 0) return operationTypes;

        // Walk from newest to oldest with cleaner uint256 math
        uint256 headU = uint256(rb.head);
        for (uint256 i; i < sz; ) {
            uint256 idx = (MAX_USER_OPS + headU + MAX_USER_OPS - 1 - i) % MAX_USER_OPS;
            operationTypes[i] = rb.buf[idx];
            unchecked { ++i; }
        }
    }

    /**
     * @dev Pure utility: a toy composite calculation.
     */
    function complexCalculation(uint256[] calldata inputs) external pure returns (uint256 result) {
        uint256 n = inputs.length;
        if (n == 0) revert EmptyData();
        result = inputs[0];
        for (uint256 i = 1; i < n; ) {
            // Alternate + and scaled multiply, intentionally simple.
            if (i % 2 == 0) {
                result = result + inputs[i];
            } else {
                result = (result * inputs[i]) / 100;
            }
            unchecked { ++i; }
        }
    }

    /**
     * @dev State summary for dashboards.
     */
    function getStateSummary()
        external
        view
        returns (uint256 value, uint256 operations, address executor, bool paused)
    {
        Layout storage l = _layout();
        return (l.currentValue, l.operationCounter, l.lastExecutor, l.paused);
    }

    /**
     * @dev Advanced analytics for production monitoring.
     * @return value Current state value
     * @return totalOps Total operations executed
     * @return lastExecutor Last executor address
     * @return isPaused Current pause state
     * @return isInitialized Initialization status
     * @return operatorAddr Current operator address
     * @return governanceAddr Current governance address
     */
    function getAdvancedAnalytics()
        external
        view
        returns (
            uint256 value,
            uint256 totalOps,
            address lastExecutor,
            bool isPaused,
            bool isInitialized,
            address operatorAddr,
            address governanceAddr
        )
    {
        Layout storage l = _layout();
        return (
            l.currentValue,
            l.operationCounter,
            l.lastExecutor,
            l.paused,
            l.initialized,
            l.operator,
            l.governance
        );
    }

    /**
     * @dev Get current nonce for EIP-712 signature generation.
     * @return nonce Current initialization nonce
     */
    function getInitNonce() external view returns (uint256 nonce) {
        return _layout().initNonce;
    }

    /**
     * @dev Get the current governance address.
     * @return governance Current governance address
     */
    function getGovernance() external view returns (address governance) {
        return _layout().governance;
    }

    /**
     * @dev Get operation statistics for a user.
     * @param user Address to analyze
     * @return totalUserOps Number of operations by user
     * @return mostRecentOp Most recent operation type (0 if none)
     * @return uniqueOpTypes Number of unique operation types used
     */
    function getUserStatistics(address user)
        external
        view
        returns (uint256 totalUserOps, uint256 mostRecentOp, uint256 uniqueOpTypes)
    {
        Layout storage l = _layout();
        UserOpsRB storage rb = l.userOps[user];

        totalUserOps = rb.size;

        if (totalUserOps > 0) {
            // Get most recent operation
            uint256 lastIdx = (MAX_USER_OPS + rb.head - 1) % MAX_USER_OPS;
            mostRecentOp = rb.buf[lastIdx];

            // Count unique operation types using bitmask (gas optimized)
            uint8 mask;
            for (uint256 i = 0; i < totalUserOps; ) {
                uint256 idx = (MAX_USER_OPS + uint256(rb.head) + MAX_USER_OPS - 1 - i) % MAX_USER_OPS;
                uint256 opType = rb.buf[idx];
                if (opType >= 1 && opType <= MAX_OPERATION_TYPE) {
                    uint8 bit = uint8(1) << uint8(opType);
                    if ((mask & bit) == 0) {
                        mask |= bit;
                        uniqueOpTypes++;
                    }
                }
                unchecked { ++i; }
            }
        }
    }

    /**
     * @dev Validate operation parameters without executing.
     * @param operationType Operation type to validate
     * @param data Operation data to validate
     * @return isValid Whether parameters are valid
     * @return reason Reason code (0=valid, 1=invalid type, 2=empty data, 3=data too large)
     */
    function validateOperation(uint256 operationType, bytes calldata data)
        external
        pure
        returns (bool isValid, uint256 reason)
    {
        if (operationType == 0 || operationType > MAX_OPERATION_TYPE) {
            return (false, 1); // Invalid operation type
        }
        if (data.length == 0) {
            return (false, 2); // Empty data
        }
        if (data.length > MAX_DATA_BYTES) {
            return (false, 3); // Data too large
        }
        return (true, 0); // Valid
    }

    /**
     * @dev Simulate operation without state changes for preview.
     * @param operationType Operation type to simulate
     * @param data Operation data
     * @return newValue What the new state value would be
     * @return gasEstimate Estimated gas cost
     */
    function simulateOperation(uint256 operationType, bytes calldata data)
        external
        view
        returns (uint256 newValue, uint256 gasEstimate)
    {
        Layout storage l = _layout();
        uint256 currentValue = l.currentValue;

        // Calculate what the new value would be
        if (operationType == 1) {
            uint256 inc = abi.decode(data, (uint256));
            newValue = currentValue + inc;
            gasEstimate = 25000; // Base estimate for increment
        } else if (operationType == 2) {
            uint256 dec = abi.decode(data, (uint256));
            newValue = dec > currentValue ? 0 : currentValue - dec;
            gasEstimate = 26000; // Base estimate for decrement
        } else if (operationType == 3) {
            uint256 mulPct = abi.decode(data, (uint256));
            newValue = (currentValue * mulPct) / 100;
            gasEstimate = 28000; // Base estimate for multiply
        } else if (operationType == 4) {
            newValue = 0;
            gasEstimate = 23000; // Base estimate for reset
        } else if (operationType == 5) {
            (uint256 a, uint256 b, uint256 c) = abi.decode(data, (uint256, uint256, uint256));
            newValue = ((a + b) * c) / 2;
            gasEstimate = 32000; // Base estimate for complex calculation
        } else {
            revert InvalidOperationType();
        }
    }

    /* ───────────────────────────── Internals ───────────────────────────── */

    function _applyOperation(uint256 operationType, bytes calldata data, Layout storage l) private {
        uint256 oldValue = l.currentValue;
        if (operationType == 1) {
            uint256 inc = abi.decode(data, (uint256));
            l.currentValue = oldValue + inc;
        } else if (operationType == 2) {
            uint256 dec = abi.decode(data, (uint256));
            // saturating subtract semantics
            l.currentValue = dec > oldValue ? 0 : oldValue - dec;
        } else if (operationType == 3) {
            uint256 mulPct = abi.decode(data, (uint256));
            l.currentValue = (oldValue * mulPct) / 100;
        } else if (operationType == 4) {
            l.currentValue = 0;
        } else if (operationType == 5) {
            (uint256 a, uint256 b, uint256 c) = abi.decode(data, (uint256, uint256, uint256));
            l.currentValue = ((a + b) * c) / 2;
        }
        emit StateChanged(oldValue, l.currentValue, msg.sender);
    }

    /* ───────────────────────── Facet metadata ─────────────────────────── */

    function getFacetInfoB()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "ExampleFacetB";
        version = "1.2.0"; // Updated version for enhanced features

        selectors = new bytes4[](17); // Increased from 15 to 17 for rotation functions
        selectors[0] = this.initializeFacetB.selector;
        selectors[1] = this.setPaused.selector;
        selectors[2] = this.rotateGovernance.selector;
        selectors[3] = this.rotateOperator.selector;
        selectors[4] = this.executeB.selector;
        selectors[5] = this.batchExecuteB.selector;
        selectors[6] = this.getOperation.selector;
        selectors[7] = this.getUserOperations.selector;
        selectors[8] = this.complexCalculation.selector;
        selectors[9] = this.getStateSummary.selector;
        selectors[10] = this.getFacetInfoB.selector;
        // Production-grade functions
        selectors[11] = this.getAdvancedAnalytics.selector;
        selectors[12] = this.getUserStatistics.selector;
        selectors[13] = this.validateOperation.selector;
        selectors[14] = this.simulateOperation.selector;
        selectors[15] = this.getInitNonce.selector;
        selectors[16] = this.getGovernance.selector;
    }
}
