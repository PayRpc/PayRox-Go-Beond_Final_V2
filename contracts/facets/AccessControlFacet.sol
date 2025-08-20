// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {PayRoxAccessControlStorage as ACS} from "../libraries/PayRoxAccessControlStorage.sol";

/**
 * @title AccessControlFacet
 * @notice Canonical owner of role management. Remove public role functions from other facets.
 */
contract AccessControlFacet {
    // OZ-compatible events
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    error MissingRole(bytes32 role, address account);
    error NotRoleAdmin(bytes32 role, address caller);

    // --- Views ---
    function hasRole(bytes32 role, address account) external view returns (bool) {
        return ACS.layout().roles[role][account];
    }

    function getRoleAdmin(bytes32 role) external view returns (bytes32) {
        bytes32 admin = ACS.layout().adminOf[role];
        return admin == bytes32(0) ? ACS.DEFAULT_ADMIN_ROLE : admin;
    }

    // --- Mutations ---
    function grantRole(bytes32 role, address account) external {
        _checkIsAdmin(role, msg.sender);
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) external {
        _checkIsAdmin(role, msg.sender);
        _revokeRole(role, account);
    }

    // --- Internals (can be called by other facets via delegatecall if desired) ---
    function _grantRole(bytes32 role, address account) internal {
        ACS.Layout storage L = ACS.layout();
        if (!L.roles[role][account]) {
            L.roles[role][account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }

    function _revokeRole(bytes32 role, address account) internal {
        ACS.Layout storage L = ACS.layout();
        if (L.roles[role][account]) {
            L.roles[role][account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }

    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal {
        ACS.Layout storage L = ACS.layout();
        bytes32 prev = L.adminOf[role];
        L.adminOf[role] = adminRole;
        emit RoleAdminChanged(role, prev, adminRole);
    }

    function _checkIsAdmin(bytes32 role, address caller) internal view {
        bytes32 admin = ACS.layout().adminOf[role];
        if (admin == bytes32(0)) admin = ACS.DEFAULT_ADMIN_ROLE;
        if (!ACS.layout().roles[admin][caller]) {
            revert NotRoleAdmin(role, caller);
        }
    }
}
