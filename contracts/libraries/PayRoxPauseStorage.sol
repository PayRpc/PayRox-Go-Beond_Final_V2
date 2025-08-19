// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

library PayRoxPauseStorage {
    bytes32 internal constant SLOT = keccak256("payrox.storage.pause.v1");

    struct Layout {
        bool paused;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = SLOT;
        assembly { l.slot := slot }
    }
}
