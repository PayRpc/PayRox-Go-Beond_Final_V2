// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

library ExampleStorage {
    bytes32 internal constant SLOT = 0x43bbd00f7ba8d5a61ab3dfe66d427a5ab85aaf5e23856a71ae055f63b2ccf392;
    struct Layout {
        bool __initialized; // from: Example
        uint256 baseVal; // from: Base
        uint256 x; // from: Example
    }
    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = SLOT;
        assembly { l.slot := slot }
    }
}

contract Base {
    uint256 baseVal;
}

contract Example is Base {
    uint256 x;

    function readX() public view returns (uint256) {
        return x;
    }

    function inc() public {
        x = x + 1;
    }
}
