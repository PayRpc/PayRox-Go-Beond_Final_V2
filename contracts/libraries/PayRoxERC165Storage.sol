// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

library PayRoxERC165Storage {
    // Diamond storage slot for ERC165 support registry
    bytes32 internal constant SLOT = keccak256("payrox.storage.erc165.v1");

    struct Layout {
        mapping(bytes4 => bool) supported; // interfaceId => supported?
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = SLOT;
        assembly { l.slot := slot }
    }
}
