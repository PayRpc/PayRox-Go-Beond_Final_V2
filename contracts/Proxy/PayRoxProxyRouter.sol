// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IManifestDispatcherView, BatchCall} from "../interfaces/IManifestDispatcher.sol";

/**
 * @title ICrossDomainMessenger
 * @notice Interface for L2 cross-domain messengers (OP-Stack, Arbitrum, etc.)
 */
interface ICrossDomainMessenger {
    function xDomainMessageSender() external view returns (address);
}

/**
 * @title PayRoxProxyRouter
 * @notice Compatibility shim that lets an existing proxy route calls to a ManifestDispatcher (Diamond entry).
 * @dev Deploy this as a new *implementation* and upgrade your existing proxy to it (UUPS/Transparent/etc.).
 *      Storage is fully namespaced (hashed slot) to avoid clobbering dispatcher/diamond storage.
 *      Codehash pinning can be disabled via expectedCodehash == bytes32(0).
 *
 * Security notes:
 *  - All routing uses `delegatecall` into the dispatcher (diamond entry) to preserve state.
 *  - `fallback` extracts the 4-byte selector via SHR(224) and enforces forbidden/paused checks.
 *  - Batch executes via `delegatecall` loop (no external helper that might use CALL).
 *  - Optional batch reentrancy lock (single slot) to prevent weird recursive batches.
 *  - `freeze()` permanently locks admin mutators except pause/forbid (for incident response).
 *  - Ownership transfer uses two-step process to prevent accidental loss.
 *  - Initialize function should be called immediately after deployment by the proxy to prevent front-running.
 *  - Codehash checking may not be effective if the dispatcher is a proxy (proxy codehash is constant).
 *  - State changes during batch execution (via delegatecall) may lead to inconsistent checks; dispatcher should avoid modifying router state.
 */
contract PayRoxProxyRouter {
    // ─────────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────────
    event PayRoxProxyRouterInitialized(
        address owner,
        address dispatcher,
        bytes32 dispatcherCodehash,
        bool strictCodehash
    );
    event DispatcherUpdated(address indexed oldDispatcher, address indexed newDispatcher, bytes32 codehash);
    event DispatcherCodehashSet(bytes32 oldCodehash, bytes32 newCodehash);
    event StrictCodehashSet(bool enabled);
    event PausedSet(bool paused);
    event SelectorsForbidden(bytes4[] selectors, bool forbidden);
    event Frozen();
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event BatchExecuted(uint256 callCount, uint256 gasUsed, uint256 timestamp);
    event L2GovernorConfigured(address l2Messenger, address l1Governor);

    // ─────────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────────
    error AlreadyInitialized();
    error NotOwner();
    error NotPendingOwner();
    error InvalidNewOwner();
    error Paused();
    error FrozenRouter();
    error DispatcherZero();
    error DispatcherCodehashMismatch(bytes32 expected, bytes32 actual);
    error ForbiddenSelector(bytes4 selector);
    error IncompatibleDispatcher(address dispatcher);
    error BatchTooLarge(uint256 size, uint256 maxSize);
    error EmptyBatch();
    error BatchReentrancy();
    error Reentrancy();

    // ─────────────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────────────
    uint256 public constant MAX_BATCH_SIZE = 50; // Anti-DoS guard
    bytes32 private constant ROUTER_SLOT = keccak256("payrox.proxy.router.v1");

    // ─────────────────────────────────────────────────────────────────────────────
    // Namespaced storage (hashed slot to avoid collision with diamond storage)
    // ─────────────────────────────────────────────────────────────────────────────
    struct RouterStorage {
        address owner;
        address pendingOwner;
        address dispatcher;
        bytes32 dispatcherCodehash; // expected EXTCODEHASH(dispatcher) or 0x0 to disable pin
        bool strictCodehash; // if true, check codehash on every call
        bool paused; // emergency pause
        bool frozen; // one-way freeze of admin mutators (except pause/forbid)
        bool batchLock; // tiny reentrancy lock for batch
        bool reentrancyLock; // reentrancy lock for fallback
        mapping(bytes4 => bool) forbidden; // hot kill-switch per selector
        
        // L2 governance (optional)
        address l2Messenger; // e.g., OP: 0x4200000000000000000000000000000000000007, Arbitrum: L2CrossDomainMessenger
        address l1Governor;  // L1 governor that's allowed through messenger
    }

    function _s() private pure returns (RouterStorage storage s) {
        bytes32 p = ROUTER_SLOT;
        assembly {
            s.slot := p
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────────
    function _isGov(address sender) internal view returns (bool) {
        RouterStorage storage s = _s();
        if (sender == s.owner) return true;
        if (sender == s.l2Messenger && s.l2Messenger != address(0)) {
            // read-through to original L1 sender
            try ICrossDomainMessenger(s.l2Messenger).xDomainMessageSender() returns (address xSender) {
                return xSender == s.l1Governor && s.l1Governor != address(0);
            } catch { return false; }
        }
        return false;
    }

    modifier onlyOwner() {
        if (msg.sender != _s().owner) revert NotOwner();
        _;
    }

    modifier onlyGovernor() {
        if (!_isGov(msg.sender)) revert NotOwner();
        _;
    }

    modifier notFrozen() {
        if (_s().frozen) revert FrozenRouter();
        _;
    }

    modifier nonReentrant() {
        RouterStorage storage s = _s();
        if (s.reentrancyLock) revert Reentrancy();
        s.reentrancyLock = true;
        _;
        s.reentrancyLock = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Admin / setup
    // ─────────────────────────────────────────────────────────────────────────────

    /// @notice One-time initializer. Must be called after your proxy is upgraded to this implementation.
    /// @dev Should be called immediately by the proxy during upgrade to prevent front-running.
    /// @param owner_ New owner of the router's admin functions (msg.sender if zero).
    /// @param dispatcher_ Address of the ManifestDispatcher to route to.
    /// @param expectedCodehash EXTCODEHASH(dispatcher_) to enforce; set 0x0 to disable checking.
    /// @param strictCodehash_ If true, each call checks dispatcher codehash before delegatecall.
    function initializeProxyRouter(
        address owner_,
        address dispatcher_,
        bytes32 expectedCodehash,
        bool strictCodehash_
    ) external {
        RouterStorage storage s = _s();
        if (s.owner != address(0)) revert AlreadyInitialized();
        if (dispatcher_ == address(0)) revert DispatcherZero();

        _validateDispatcherCompatibility(dispatcher_);

        s.owner = owner_ == address(0) ? msg.sender : owner_;
        s.dispatcher = dispatcher_;
        s.dispatcherCodehash = expectedCodehash; // 0x0 => "no pin"
        s.strictCodehash = strictCodehash_;
        s.paused = false;
        s.frozen = false;
        s.batchLock = false;
        s.reentrancyLock = false;

        emit PayRoxProxyRouterInitialized(s.owner, s.dispatcher, s.dispatcherCodehash, s.strictCodehash);
    }

    /// @notice Transfer ownership of router admin (two-step process).
    function transferOwnership(address newOwner) external onlyGovernor {
        if (newOwner == address(0)) revert InvalidNewOwner();
        RouterStorage storage s = _s();
        s.pendingOwner = newOwner;
        emit OwnershipTransferStarted(s.owner, newOwner);
    }

    /// @notice New owner accepts ownership.
    function acceptOwnership() external {
        RouterStorage storage s = _s();
        if (msg.sender != s.pendingOwner) revert NotPendingOwner();
        address previousOwner = s.owner;
        s.owner = s.pendingOwner;
        s.pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, s.owner);
    }

    /// @notice Renounce ownership (danger; only for fully automated flows).
    function renounceOwnership() external onlyGovernor {
        RouterStorage storage s = _s();
        address prev = s.owner;
        s.owner = address(0);
        s.pendingOwner = address(0);
        emit OwnershipTransferred(prev, address(0));
    }

    /// @notice Set a new dispatcher. Requires not frozen.
    function setDispatcher(address dispatcher_, bytes32 expectedCodehash) external onlyGovernor notFrozen {
        if (dispatcher_ == address(0)) revert DispatcherZero();
        _validateDispatcherCompatibility(dispatcher_);
        RouterStorage storage s = _s();
        address old = s.dispatcher;
        s.dispatcher = dispatcher_;
        s.dispatcherCodehash = expectedCodehash; // 0x0 => "no pin"
        emit DispatcherUpdated(old, dispatcher_, expectedCodehash);
    }

    /// @notice Update expected dispatcher codehash (e.g., after redeploy). 0x0 disables the check.
    function setDispatcherCodehash(bytes32 expected) external onlyGovernor notFrozen {
        RouterStorage storage s = _s();
        bytes32 old = s.dispatcherCodehash;
        s.dispatcherCodehash = expected;
        emit DispatcherCodehashSet(old, expected);
    }

    /// @notice Toggle strict per-call codehash checks.
    function setStrictCodehash(bool enabled) external onlyGovernor notFrozen {
        _s().strictCodehash = enabled;
        emit StrictCodehashSet(enabled);
    }

    /// @notice Pause/unpause routing (allowed even when frozen).
    function setPaused(bool paused_) external onlyGovernor {
        _s().paused = paused_;
        emit PausedSet(paused_);
    }

    /// @notice Forbid/allow a batch of selectors (hot kill-switch). Allowed even when frozen.
    function setForbiddenSelectors(bytes4[] calldata selectors, bool forbidden) external onlyGovernor {
        RouterStorage storage s = _s();
        for (uint256 i = 0; i < selectors.length; i++) {
            s.forbidden[selectors[i]] = forbidden;
        }
        emit SelectorsForbidden(selectors, forbidden);
    }

    /// @notice One-way freeze of admin mutators (except pause/forbid).
    function freeze() external onlyGovernor {
        _s().frozen = true;
        emit Frozen();
    }

    /// @notice Configure L2 cross-domain governance (OP-Stack, Arbitrum, etc.)
    /// @param l2Messenger_ Address of L2 cross-domain messenger (e.g., 0x4200...0007 on OP-Stack)
    /// @param l1Governor_ Address of L1 governor that can send messages through messenger
    function setL2Governor(address l2Messenger_, address l1Governor_) external onlyOwner notFrozen {
        RouterStorage storage s = _s();
        s.l2Messenger = l2Messenger_;
        s.l1Governor = l1Governor_;
        emit L2GovernorConfigured(l2Messenger_, l1Governor_);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Routing
    // ─────────────────────────────────────────────────────────────────────────────
    receive() external payable {
        if (_s().paused) revert Paused();
    }

    fallback() external payable nonReentrant {
        RouterStorage storage s = _s();
        if (s.paused) revert Paused();

        // Extract the 4-byte selector (first 4 bytes of calldata)
        bytes4 sel;
        assembly {
            sel := shr(224, calldataload(0))
        }

        if (s.forbidden[sel]) revert ForbiddenSelector(sel);

        address target = s.dispatcher;

        if (s.strictCodehash) {
            // If expected is 0x0 => do not enforce (proxy-safe sentinel)
            bytes32 expected = s.dispatcherCodehash;
            if (expected != bytes32(0)) {
                bytes32 got = _extcodehash(target);
                if (got != expected) revert DispatcherCodehashMismatch(expected, got);
            }
        }

        // Delegatecall to dispatcher; bubble exact returndata
        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(gas(), target, ptr, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(ptr, 0, size)
            switch result
            case 0 {
                revert(ptr, size)
            }
            default {
                return(ptr, size)
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Batch Operations (delegatecall loop; revert-on-first-failure)
    // ─────────────────────────────────────────────────────────────────────────────

    /// @notice Execute multiple calls in a single transaction (all routed via dispatcher).
    /// @dev Reverts the whole batch if any inner call fails. Uses symmetric reentrancy protection with fallback.
    function batchExecute(BatchCall[] calldata calls) external returns (bytes[] memory results) {
        RouterStorage storage s = _s();
        if (s.paused) revert Paused();
        if (s.batchLock || s.reentrancyLock) revert Reentrancy(); // symmetric with fallback
        uint256 n = calls.length;
        if (n == 0) revert EmptyBatch();
        if (n > MAX_BATCH_SIZE) revert BatchTooLarge(n, MAX_BATCH_SIZE);

        // Codehash check (if strict and pinned)
        if (s.strictCodehash) {
            bytes32 expected = s.dispatcherCodehash;
            if (expected != bytes32(0)) {
                bytes32 got = _extcodehash(s.dispatcher);
                if (got != expected) revert DispatcherCodehashMismatch(expected, got);
            }
        }

        // Pre-assemble results array
        results = new bytes[](n);

        uint256 gasBefore = gasleft();
        s.batchLock = true;
        s.reentrancyLock = true;

        for (uint256 i = 0; i < n; ) {
            bytes4 sel = calls[i].selector;
            if (s.forbidden[sel]) revert ForbiddenSelector(sel);

            // Build calldata = selector (4) + data
            bytes memory cd = abi.encodePacked(sel, calls[i].data);

            bool ok;
            bytes memory ret;
            (ok, ret) = _delegateTo(s.dispatcher, cd);

            if (!ok) {
                s.batchLock = false;
                s.reentrancyLock = false;
                // Bubble the exact revert data from the inner call
                assembly {
                    revert(add(ret, 0x20), mload(ret))
                }
            }

            results[i] = ret;

            unchecked {
                ++i;
            }
        }

        s.batchLock = false;
        s.reentrancyLock = false;
        unchecked {
            uint256 gasUsed = gasBefore - gasleft();
            emit BatchExecuted(n, gasUsed, block.timestamp);
        }
    }

    /// @notice Execute the same function (selector) multiple times with different `data` items.
    /// @dev Convenience wrapper that assembles calls client-side equivalently to `batchExecute`.
    function batchCallSameFunction(bytes4 selector, bytes[] calldata datas) external returns (bytes[] memory results) {
        RouterStorage storage s = _s();
        if (s.paused) revert Paused();
        if (s.batchLock || s.reentrancyLock) revert Reentrancy(); // symmetric with fallback
        uint256 n = datas.length;
        if (n == 0) revert EmptyBatch();
        if (n > MAX_BATCH_SIZE) revert BatchTooLarge(n, MAX_BATCH_SIZE);
        if (s.forbidden[selector]) revert ForbiddenSelector(selector);

        // Codehash check (if strict and pinned)
        if (s.strictCodehash) {
            bytes32 expected = s.dispatcherCodehash;
            if (expected != bytes32(0)) {
                bytes32 got = _extcodehash(s.dispatcher);
                if (got != expected) revert DispatcherCodehashMismatch(expected, got);
            }
        }

        // Pre-assemble results array
        results = new bytes[](n);

        uint256 gasBefore = gasleft();
        s.batchLock = true;
        s.reentrancyLock = true;

        for (uint256 i = 0; i < n; ) {
            // Build calldata = selector (4) + data
            bytes memory cd = abi.encodePacked(selector, datas[i]);

            bool ok;
            bytes memory ret;
            (ok, ret) = _delegateTo(s.dispatcher, cd);

            if (!ok) {
                s.batchLock = false;
                s.reentrancyLock = false;
                // Bubble the exact revert data from the inner call
                assembly {
                    revert(add(ret, 0x20), mload(ret))
                }
            }

            results[i] = ret;

            unchecked {
                ++i;
            }
        }

        s.batchLock = false;
        s.reentrancyLock = false;
        unchecked {
            uint256 gasUsed = gasBefore - gasleft();
            emit BatchExecuted(n, gasUsed, block.timestamp);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Views / convenience
    // ─────────────────────────────────────────────────────────────────────────────

    function owner() external view returns (address) {
        return _s().owner;
    }

    function pendingOwner() external view returns (address) {
        return _s().pendingOwner;
    }

    function dispatcher() external view returns (address) {
        return _s().dispatcher;
    }

    function dispatcherCodehash() external view returns (bytes32) {
        return _s().dispatcherCodehash;
    }

    function strictCodehash() external view returns (bool) {
        return _s().strictCodehash;
    }

    function paused() external view returns (bool) {
        return _s().paused;
    }

    function frozen() external view returns (bool) {
        return _s().frozen;
    }

    function isForbidden(bytes4 selector) external view returns (bool) {
        return _s().forbidden[selector];
    }

    function l2Messenger() external view returns (address) {
        return _s().l2Messenger;
    }

    function l1Governor() external view returns (address) {
        return _s().l1Governor;
    }

    /// @notice Convenience helpers (best-effort; only if dispatcher supports the view)
    function getRoute(bytes4 selector) external view returns (address facet, bytes32 codehash) {
        return IManifestDispatcherView(_s().dispatcher).routes(selector);
    }

    function getActiveManifestRoot() external view returns (bytes32) {
        return IManifestDispatcherView(_s().dispatcher).activeRoot();
    }

    function isDispatcherFrozen() external view returns (bool) {
        return IManifestDispatcherView(_s().dispatcher).frozen();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Internals
    // ─────────────────────────────────────────────────────────────────────────────
    function _extcodehash(address a) internal view returns (bytes32 h) {
        assembly {
            h := extcodehash(a)
        }
    }

    function _delegateTo(address target, bytes memory calldata_) private returns (bool ok, bytes memory ret) {
        assembly {
            let cd := add(calldata_, 0x20)
            let cdlen := mload(calldata_)
            let ptr := mload(0x40)

            ok := delegatecall(gas(), target, cd, cdlen, 0, 0)
            let size := returndatasize()

            ret := ptr
            mstore(ret, size)                                   // [len | data]
            returndatacopy(add(ret, 0x20), 0, size)

            // bump free mem: ret + 0x20 (len) + size (padded to 32)
            mstore(0x40, add(add(ret, 0x20), and(add(size, 31), not(31))))
        }
    }

    /// @notice Validate that the dispatcher supports the ManifestDispatcher view surface.
    function _validateDispatcherCompatibility(address dispatcher_) internal view {
        // Best-effort: if it reverts on activeRoot(), consider incompatible
        try IManifestDispatcherView(dispatcher_).activeRoot() returns (bytes32) {
            return;
        } catch {
            revert IncompatibleDispatcher(dispatcher_);
        }
    }
}