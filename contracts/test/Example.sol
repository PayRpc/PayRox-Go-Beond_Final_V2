// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

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
