// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { PayRoxStorage } from "../libraries/PayRoxStorage.sol";
import { PayRoxPauseStorage as PS } from "../libraries/PayRoxPauseStorage.sol";

contract PayRoxPaymentsFacet {
    // Minimal facet that records and settles payments in shared diamond storage.

    /// @notice Record a payment (caller funds the payment if sending ETH)
    function createPayment(address to, uint256 amount, bytes32 ref) external payable {
    PayRoxStorage.Layout storage s = PayRoxStorage.layout();
    require(!PS.layout().paused, "paused");
        require(to != address(0), "bad to");

        // For simplicity this records intent; optionally require msg.value == amount to accept ETH
        PayRoxStorage.Payment storage p = s.payments[ref];
        require(p.from == address(0), "exists");

        p.from = msg.sender;
        p.to = to;
        p.amount = amount;
        p.ref = ref;
        p.settled = false;

        // update balance ledger if ETH was sent
        if (msg.value > 0) {
            require(msg.value == amount, "msg.value mismatch");
            s.balances[to] += msg.value;
        }
    }

    /// @notice Settle a recorded payment (only owner or treasury)
    function settlePayment(bytes32 ref) external {
        PayRoxStorage.Layout storage s = PayRoxStorage.layout();
        PayRoxStorage.Payment storage p = s.payments[ref];
        require(p.from != address(0), "missing");
        require(!p.settled, "settled");
        require(msg.sender == s.owner || msg.sender == s.treasury, "only owner/treasury");

        p.settled = true;
        // transfer ledger balance to recipient if present
        uint256 bal = s.balances[p.to];
        if (bal > 0) {
            s.balances[p.to] = 0;
            (bool ok, ) = p.to.call{value: bal}("");
            require(ok, "transfer failed");
        }
    }

    function getPayment(bytes32 ref) external view returns (address from, address to, uint256 amount, bool settled) {
        PayRoxStorage.Payment storage p = PayRoxStorage.layout().payments[ref];
        return (p.from, p.to, p.amount, p.settled);
    }
}
