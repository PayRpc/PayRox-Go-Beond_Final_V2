// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {LibSecurityStorage as Sec} from "../security/LibSecurityStorage.sol";
import {IAntiBotFacet} from "./IAntiBotFacet.sol";

/**
 * @title SecurityFacet (AntiBotLite) for PayRox
 * @notice Throttling + buyback pause + circuit breaker, driven by an off-chain monitor.
 *         Call validateTransaction() in sensitive paths. No on-chain oracle dependency.
 */
contract SecurityFacet is ReentrancyGuard, IAntiBotFacet {
    // ---- Errors ----
    error AuthDenied();
    
    // ---- Role ids (keccak256 constants) ----
    function GOVERNANCE_ROLE() public pure returns (bytes32) { return keccak256("GOVERNANCE_ROLE"); }
    function MONITOR_ROLE()    public pure returns (bytes32) { return keccak256("MONITOR_ROLE"); }

    // ---- Events ----
    event AntibotStatusUpdated(bool enabled);
    event ThrottleUpdated(uint256 blocks);
    event ThresholdsUpdated(uint256 pauseBps, uint256 circuitBps);
    event BuybackPaused(bool status);
    event CircuitBreaker(bool status, int256 moveBps);
    event Throttled(address indexed user, uint256 untilBlock);
    event TrustedAdded(address indexed account);
    event TrustedRemoved(address indexed account);
    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);
    event MonitorPing(address indexed monitor, int256 moveBps);

    // ---- Internal helpers ----
    // Storage for facet owner (compatible with PayRox pattern)
    bytes32 private constant OWNER_SLOT = keccak256("payrox.security.owner");
    // Namespace for refactor safety checks (must match LibSecurityStorage)
    bytes32 private constant _SEC_SLOT = keccak256("payrox.security.antibot.v1");
    
    function _getOwner() internal view returns (address owner) {
        bytes32 slot = OWNER_SLOT;
        assembly { owner := sload(slot) }
    }
    
    function _setOwner(address newOwner) internal {
        bytes32 slot = OWNER_SLOT;
        assembly { sstore(slot, newOwner) }
    }
    
    function _isOwner(address a) internal view returns (bool) {
        return a == _getOwner();
    }

    modifier onlyOwner() {
        require(_isOwner(msg.sender), "SecurityFacet: not owner");
        _;
    }

    modifier onlyGovOrOwner() {
        Sec.Layout storage L = Sec.layout();
        if (!(L.roles[GOVERNANCE_ROLE()][msg.sender] || _isOwner(msg.sender))) revert AuthDenied();
        _;
    }

    modifier onlyMonitorOrOwner() {
        Sec.Layout storage L = Sec.layout();
        if (!(L.roles[MONITOR_ROLE()][msg.sender] || _isOwner(msg.sender))) revert AuthDenied();
        _;
    }

    // ==== Initialization (call once via DiamondInit) ====
    function initializeSecurityFacet(
        bool enabled,
        uint256 throttleBlocks,
        uint256 pauseBps,
        uint256 circuitBps,
        address[] calldata initialTrusted,
        address governance,
        address monitor
    ) external {
        // Set caller as owner if not already set
        if (_getOwner() == address(0)) {
            _setOwner(msg.sender);
        }
        
        // Only owner can initialize
        require(_isOwner(msg.sender), "SecurityFacet: not owner");
        
        Sec.Layout storage L = Sec.layout();

        L.antibotEnabled      = enabled;
        L.throttleBlocks      = throttleBlocks == 0 ? 1 : throttleBlocks;
        L.pauseThresholdBps   = pauseBps == 0 ? 500 : pauseBps;       // default 5%
        L.circuitThresholdBps = circuitBps == 0 ? 1500 : circuitBps;  // default 15%

        // trust owner by default
        L.trusted[msg.sender] = true;

        for (uint256 i = 0; i < initialTrusted.length; i++) {
            L.trusted[initialTrusted[i]] = true;
            emit TrustedAdded(initialTrusted[i]);
        }

        if (governance != address(0)) {
            L.roles[GOVERNANCE_ROLE()][governance] = true;
            emit RoleGranted(GOVERNANCE_ROLE(), governance);
            L.trusted[governance] = true;
            emit TrustedAdded(governance);
        }
        if (monitor != address(0)) {
            L.roles[MONITOR_ROLE()][monitor] = true;
            emit RoleGranted(MONITOR_ROLE(), monitor);
            L.trusted[monitor] = true;
            emit TrustedAdded(monitor);
        }
    }

    // ==== Guards (call these from sensitive selectors) ====

    /// @notice Reverts if throttled or circuit breaker active. Updates sender's lastTxBlock if enabled.
    function validateTransaction(address sender)
        external
        override
        returns (bool ok)
    {
        Sec.Layout storage L = Sec.layout();

        if (L.circuitBroken) revert CircuitBreakerActive();

        if (L.antibotEnabled && !L.trusted[sender]) {
            uint256 last = L.lastTxBlock[sender];
            uint256 minNext = last + (L.throttleBlocks == 0 ? 1 : L.throttleBlocks);
            if (block.number < minNext) {
                emit Throttled(sender, minNext);
                revert TransactionThrottled(sender, minNext);
            }
            if (last != block.number) {
                L.lastTxBlock[sender] = block.number;
            }
        }
        return true;
    }

    /// @notice Reverts if buyback is paused or circuit breaker active.
    function ensureBuybackAllowed() external view override returns (bool ok) {
        Sec.Layout storage L = Sec.layout();
        if (L.circuitBroken) revert CircuitBreakerActive();
        require(!L.buybackPaused, "BUYBACK_PAUSED");
        return true;
    }

    // ==== Off-chain monitor hook ====

    /// @notice Report market move in basis points; negative for drops (e.g., -600 = -6%).
    function reportMarketMove(int256 moveBps) external override onlyMonitorOrOwner nonReentrant {
        Sec.Layout storage L = Sec.layout();
        emit MonitorPing(msg.sender, moveBps);

        // Trip breaker on large drop
        if (moveBps <= -int256(L.circuitThresholdBps)) {
            if (!L.circuitBroken) {
                L.circuitBroken = true;
                if (!L.buybackPaused) {
                    L.buybackPaused = true;
                    emit BuybackPaused(true);
                }
                emit CircuitBreaker(true, moveBps);
            }
            return;
        }

        // Pause buyback on moderate drop; unpause on >= 0 if not broken
        if (moveBps <= -int256(L.pauseThresholdBps)) {
            if (!L.buybackPaused) {
                L.buybackPaused = true;
                emit BuybackPaused(true);
            }
        } else if (moveBps >= 0 && L.buybackPaused && !L.circuitBroken) {
            L.buybackPaused = false;
            emit BuybackPaused(false);
        }
    }

    // ==== Admin / config ====
    function setEnabled(bool enabled) external override onlyGovOrOwner {
        Sec.Layout storage L = Sec.layout();
        if (L.antibotEnabled != enabled) {
            L.antibotEnabled = enabled;
            emit AntibotStatusUpdated(enabled);
        }
    }

    function setThrottleBlocks(uint256 blocks_) external override onlyGovOrOwner {
        Sec.Layout storage L = Sec.layout();
        L.throttleBlocks = blocks_ == 0 ? 1 : blocks_;
        emit ThrottleUpdated(L.throttleBlocks);
    }

    function setThresholds(uint256 pauseBps_, uint256 circuitBps_) external override onlyGovOrOwner {
        if (pauseBps_ == 0 || pauseBps_ >= circuitBps_) revert BadThresholds();
        Sec.Layout storage L = Sec.layout();
        L.pauseThresholdBps = pauseBps_;
        L.circuitThresholdBps = circuitBps_;
        emit ThresholdsUpdated(pauseBps_, circuitBps_);
    }

    function setBuybackPaused(bool paused) external override onlyGovOrOwner {
        Sec.Layout storage L = Sec.layout();
        if (L.buybackPaused != paused) {
            L.buybackPaused = paused;
            emit BuybackPaused(paused);
        }
    }

    function resetCircuitBreaker() external override onlyGovOrOwner {
        Sec.Layout storage L = Sec.layout();
        if (L.circuitBroken) {
            L.circuitBroken = false;
            emit CircuitBreaker(false, 0);
        }
    }

    // ==== Trust / roles ====
    function addTrusted(address a) external override onlyGovOrOwner {
        Sec.Layout storage L = Sec.layout();
        if (!L.trusted[a]) {
            L.trusted[a] = true;
            emit TrustedAdded(a);
        }
    }

    function removeTrusted(address a) external override onlyGovOrOwner {
        Sec.Layout storage L = Sec.layout();
        if (L.trusted[a]) {
            L.trusted[a] = false;
            emit TrustedRemoved(a);
        }
    }

    // Access control functions are provided by the canonical AccessControlFacet to avoid selector collisions

    function isTrusted(address a) external view override returns (bool) {
        return Sec.layout().trusted[a];
    }

    // ===== Read-only helpers for ops/CLI =====
    struct SecurityConfig {
        bool antibotEnabled;
        bool buybackPaused;
        bool circuitBroken;
        uint256 throttleBlocks;
        uint256 pauseThresholdBps;
        uint256 circuitThresholdBps;
    }

    function getSecurityConfig() external view returns (SecurityConfig memory cfg) {
        Sec.Layout storage L = Sec.layout();
        cfg.antibotEnabled = L.antibotEnabled;
        cfg.buybackPaused = L.buybackPaused;
        cfg.circuitBroken = L.circuitBroken;
        cfg.throttleBlocks = L.throttleBlocks;
        cfg.pauseThresholdBps = L.pauseThresholdBps;
        cfg.circuitThresholdBps = L.circuitThresholdBps;
    }

    function isSecurityInitialized() external view returns (bool) {
        return _getOwner() != address(0);
    }
}
