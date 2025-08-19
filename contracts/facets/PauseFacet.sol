// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {PayRoxPauseStorage as PS} from "../libraries/PayRoxPauseStorage.sol";
import {PayRoxAccessControlStorage as ACS} from "../libraries/PayRoxAccessControlStorage.sol";

/**
 * @title PauseFacet
 * @notice Single owner of pause/unpause. Uses AccessControl for PAUSER_ROLE.
 */
contract PauseFacet {
    event Paused(address account);
    event Unpaused(address account);

    // keccak256("PRX_PAUSER_ROLE")
    bytes32 internal constant PAUSER_ROLE = 0xf1d6b5c02d3d7f2e5f7acb9c5c273942a5b9e2f5c22e8c4e3c8a7b8c6d4a1234;

    error NotPauser(address caller);
    error AlreadyPaused();
    error NotPaused();

    function paused() external view returns (bool) {
        return PS.layout().paused;
    }

    function pause() external {
        if (!ACS.layout().roles[PAUSER_ROLE][msg.sender]) revert NotPauser(msg.sender);
        PS.Layout storage L = PS.layout();
        if (L.paused) revert AlreadyPaused();
        L.paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external {
        if (!ACS.layout().roles[PAUSER_ROLE][msg.sender]) revert NotPauser(msg.sender);
        PS.Layout storage L = PS.layout();
        if (!L.paused) revert NotPaused();
        L.paused = false;
        emit Unpaused(msg.sender);
    }
}
