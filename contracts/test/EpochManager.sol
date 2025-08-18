// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract EpochManager {
    address public owner;
    uint64 private current;
    event EpochAdvanced(uint64 indexed oldEpoch, uint64 indexed newEpoch);
    // optional listener (e.g., DiamondWithEpoch) to notify on epoch changes
    address public listener;

    // Maximum allowed epoch jump when using setEpoch
    uint64 public constant MAX_EPOCH_JUMP = 100;

    constructor() {
        owner = msg.sender;
        current = 0;
    }

    function getCurrentEpoch() external view returns (uint64) {
        return current;
    }

    function advanceEpoch() external returns (bool) {
        require(msg.sender == owner, "Unauthorized");
        uint64 old = current;
        current = current + 1;
        emit EpochAdvanced(old, current);
        // notify listener if set (best-effort)
        if (listener != address(0)) {
            // Call listener.onEpochAdvanced(old, current) if present
            // solhint-disable-next-line avoid-low-level-calls
            (bool ok, ) = listener.call(abi.encodeWithSignature("onEpochAdvanced(uint64,uint64)", old, current));
            // ignore result; tests expect best-effort behavior
            ok;
        }
        return true;
    }

    /// @notice Register a listener to be notified on epoch changes (dev/test only)
    function registerListener(address l) external {
        listener = l;
    }

    /// @notice Set the epoch directly (used by tests). Reverts if jump too large.
    function setEpoch(uint64 newEpoch) external {
        uint64 old = current;
        if (newEpoch > old + MAX_EPOCH_JUMP) revert("Epoch jump too large");
        current = newEpoch;
        emit EpochAdvanced(old, current);
    // Intentionally do not notify listener for setEpoch to simulate an
    // out-of-band epoch change used by tests to detect desync.
    }
}
