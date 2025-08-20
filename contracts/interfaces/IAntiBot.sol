// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title IAntiBot
 * @notice Interface for AntiBot security module
 */
interface IAntiBot {
    /**
     * @notice Checks price impact for transactions
     */
    function checkPriceImpact() external;

    /**
     * @notice Creates a commit for sensitive operations
     * @param hashedData The hashed data for the commit
     */
    function createCommit(bytes32 hashedData) external;

    /**
     * @notice Executes a previously committed operation
     * @param data The operation data
     * @param salt The salt used in the commit
     */
    function executeCommit(bytes calldata data, bytes32 salt) external;

    /**
     * @notice Commits to whitelist addition
     * @param account The account to whitelist
     * @param salt The salt for the commit
     */
    function commitWhitelistAdd(address account, bytes32 salt) external;

    /**
     * @notice Vote to activate failsafe mode
     */
    function voteToActivateFailsafeMode() external;

    /**
     * @notice Vote to deactivate failsafe mode
     */
    function voteToDeactivateFailsafeMode() external;

    /**
     * @notice Emergency price override function
     * @param price The emergency price to set
     */
    function emergencyPriceOverride(int256 price) external;
}
