// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Diamond storage for the PayRox protocol (shared by multiple facets).
library PayRoxStorage {
    // Unique slot for this storage layout (compile-time constant).
    bytes32 internal constant SLOT = keccak256("payrox.storage.v1");

    struct Payment {
        address from;
        address to;
        uint256 amount;
        bytes32 ref;     // invoice / order id etc.
        bool settled;
    }

    struct Layout {
        // admin/config
    address owner;
    address treasury;
    uint16  feeBps;      // protocol fee in bps (<= 10_000)

        // simple nonReentrant guard
        bool    reentrancy;

        // ledgers
        mapping(address => uint256) balances;                      // internal ETH balances
        mapping(address => mapping(address => uint256)) allowance; // pull-payment allowance
        mapping(bytes32 => Payment) payments;                      // payment records
    }

    /// @dev Accessor for the diamond storage layout.
    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = SLOT;
        assembly {
            l.slot := slot
        }
    }
}
