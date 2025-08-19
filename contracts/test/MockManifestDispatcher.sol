// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../interfaces/IManifestDispatcher.sol";

contract MockManifestDispatcher is IManifestDispatcher {
    bytes32 private _activeRoot;
    uint64 private _activeEpoch;
    bytes32 private _pendingRoot;
    uint64 private _pendingEpoch;
    uint64 private _pendingSince;
    uint64 private _activationDelay = 3600; // 1 hour
    bool private _frozen = false;

    mapping(bytes4 => Route) private _routes;

    function routes(bytes4 selector) external view returns (address facet, bytes32 codehash) {
        Route memory route = _routes[selector];
        return (route.facet, route.codehash);
    }

    function pendingRoot() external view returns (bytes32) {
        return _pendingRoot;
    }

    function pendingEpoch() external view returns (uint64) {
        return _pendingEpoch;
    }

    function pendingSince() external view returns (uint64) {
        return _pendingSince;
    }

    function activeRoot() external view returns (bytes32) {
        return _activeRoot;
    }

    function activeEpoch() external view returns (uint64) {
        return _activeEpoch;
    }

    function activationDelay() external view returns (uint64) {
        return _activationDelay;
    }

    function frozen() external view returns (bool) {
        return _frozen;
    }

    // Test helpers
    function setActiveRoot(bytes32 root) external {
        _activeRoot = root;
    }

    function setActiveEpoch(uint64 epoch) external {
        _activeEpoch = epoch;
    }

    function setFrozen(bool isFrozen) external {
        _frozen = isFrozen;
    }

    // Minimal IAccessControl implementation
    function hasRole(bytes32, address) external pure returns (bool) {
        return true;
    }

    function getRoleAdmin(bytes32) external pure returns (bytes32) {
        return 0x00;
    }

    function grantRole(bytes32, address) external pure {
        // Mock implementation
    }

    function revokeRole(bytes32, address) external pure {
        // Mock implementation  
    }

    function renounceRole(bytes32, address) external pure {
        // Mock implementation
    }

    // Stub implementations for IManifestDispatcher
    function commitRoot(bytes32, uint64) external pure {
        revert("Not implemented in mock");
    }

    function applyRoutes(
        bytes4[] calldata,
        address[] calldata,
        bytes32[] calldata,
        bytes32[][] calldata,
        bool[][] calldata
    ) external pure {
        revert("Not implemented in mock");
    }

    function activateCommittedRoot() external pure {
        revert("Not implemented in mock");
    }

    function removeRoutes(bytes4[] calldata) external pure {
        revert("Not implemented in mock");
    }

    function setActivationDelay(uint64) external pure {
        revert("Not implemented in mock");
    }

    function freeze() external pure {
        revert("Not implemented in mock");
    }

    function pause() external pure {
        revert("Not implemented in mock");
    }

    function unpause() external pure {
        revert("Not implemented in mock");
    }

    function getManifestInfo() external pure returns (ManifestInfo memory info) {
        return ManifestInfo(bytes32(0), 0, 0, 0);
    }

    // supportsInterface centralized in ERC165Facet; mock intentionally minimal to avoid selector collisions.
}
