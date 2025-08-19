// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @dev Diamond storage for AccessControl (OZ-compatible layout & events).
 * DEFAULT_ADMIN_ROLE = 0x00 per ERC spec.
 */
library PayRoxAccessControlStorage {
    bytes32 internal constant SLOT = keccak256("payrox.storage.accesscontrol.v1");
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;

    struct Layout {
        mapping(bytes32 => mapping(address => bool)) roles;
        mapping(bytes32 => bytes32) adminOf;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = SLOT;
        assembly { l.slot := slot }
    }
}
