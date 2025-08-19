// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IAntiBotFacet {
    // --- Errors ---
    error CircuitBreakerActive();
    error TransactionThrottled(address user, uint256 untilBlock);
    error BadThresholds();

    // --- Roles (bytes32) ---
    function GOVERNANCE_ROLE() external pure returns (bytes32);
    function MONITOR_ROLE() external pure returns (bytes32);

    // --- Guards to call from sensitive selectors ---
    function validateTransaction(address sender) external returns (bool ok);
    function ensureBuybackAllowed() external view returns (bool ok);

    // --- Monitor hook (off-chain sentinel reports % move in bps; negative for drops) ---
    function reportMarketMove(int256 moveBps) external;

    // --- Admin / config ---
    function setEnabled(bool enabled) external;
    function setThrottleBlocks(uint256 blocks_) external;
    function setThresholds(uint256 pauseBps_, uint256 circuitBps_) external;
    function setBuybackPaused(bool paused) external;
    function resetCircuitBreaker() external;

    // --- Trust / roles ---
    function addTrusted(address a) external;
    function removeTrusted(address a) external;
    // hasRole/grantRole/revokeRole provided by canonical AccessControlFacet to avoid selector collisions
    function isTrusted(address a) external view returns (bool);
}
