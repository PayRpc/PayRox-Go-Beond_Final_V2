// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @dev Dedicated storage for the security facet (diamond-safe).
library LibSecurityStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256('payrox.security.antibot.v1');

    struct Layout {
        // switches
        bool antibotEnabled;
        bool buybackPaused;
        bool circuitBroken;
        // thresholds
        uint256 throttleBlocks; // min blocks between tx per sender on guarded calls
        uint256 pauseThresholdBps; // when monitor reports <= -pauseThresholdBps, pause buyback
        uint256 circuitThresholdBps; // when monitor reports <= -circuitThresholdBps, trip breaker
        // state
        mapping(address => uint256) lastTxBlock;
        mapping(address => bool) trusted; // allowlist
        // simple roles (owner is always allowed)
        mapping(bytes32 => mapping(address => bool)) roles;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
