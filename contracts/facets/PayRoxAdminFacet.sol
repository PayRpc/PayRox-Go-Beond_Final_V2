// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { PayRoxStorage } from "../libraries/PayRoxStorage.sol";
import { PayRoxPauseStorage as PS } from "../libraries/PayRoxPauseStorage.sol";
import { RefactorSafetyLib } from "../libraries/RefactorSafetyLib.sol";

contract PayRoxAdminFacet {
    using RefactorSafetyLib for *;

    /// @notice One-time initializer (call via dispatcher) — sets owner/treasury and validates storage layout.
    function initPayRox(address owner, address treasury, uint16 feeBps, bytes32 expectedStructHash) external {
        PayRoxStorage.Layout storage s = PayRoxStorage.layout();
        require(s.owner == address(0), "Already initialized");
        require(owner != address(0) && treasury != address(0), "bad params");
        require(feeBps <= 10_000, "feeBps");

        s.owner = owner;
        s.treasury = treasury;
        s.feeBps = feeBps;

        // (Optional) storage layout safety check using your RefactorSafetyLib
        bytes32 actual = RefactorSafetyLib.hashStorageStruct(
            abi.encodePacked(
                "PayRoxLayout(",
                    "address owner,",
                    "address treasury,",
                    "uint16 feeBps,",
                    "bool paused,",
                    "bool reentrancy,",
                    "mapping(address=>uint256) balances,",
                    "mapping(address=>mapping(address=>uint256)) allowance,",
                    "mapping(bytes32=>Payment) payments",
                ")",
                "Payment(address from,address to,uint256 amount,bytes32 ref,bool settled)"
            )
        );
        RefactorSafetyLib.validateStorageLayout(PayRoxStorage.SLOT, expectedStructHash, actual);
    }

    // Admin ops
    function setFee(uint16 feeBps) external {
        PayRoxStorage.Layout storage s = PayRoxStorage.layout();
        require(msg.sender == s.owner, "only owner");
        require(feeBps <= 10_000, "feeBps");
        s.feeBps = feeBps;
    }

    function getConfig() external view returns (address owner, address treasury, uint16 feeBps, bool paused) {
        PayRoxStorage.Layout storage s = PayRoxStorage.layout();
        // Read canonical paused state from Pause storage to avoid duplication of pause selectors
        return (s.owner, s.treasury, s.feeBps, PS.layout().paused);
    }
}
