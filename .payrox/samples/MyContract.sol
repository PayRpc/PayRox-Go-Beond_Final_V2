// Sample contract for transformer POC
pragma solidity ^0.8.0;

contract MyContract {
    uint256 public x;
    address public owner;

    constructor(uint256 _x) {
        x = _x;
        owner = msg.sender;
    }

    function getX() public view returns (uint256) {
        return x;
    }

    function inc() public {
        x += 1;
    }
}
