// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Shared interface for ManifestDispatcher used by other contracts.
interface IManifestDispatcher {
    struct Route {
        address facet;
        bytes32 codehash;
    }

    struct ManifestInfo {
        bytes32 hash;
        uint64 version;
        uint64 timestamp;
        uint256 selectorCount;
    }

    // Events (kept for off-chain tooling compatibility)
    event RootCommitted(bytes32 indexed root, uint64 indexed epoch);
    event RootActivated(bytes32 indexed root, uint64 indexed epoch);
    event RouteAdded(bytes4 indexed selector, address indexed facet, bytes32 codehash);
    event RouteRemoved(bytes4 indexed selector);
    event ActivationDelaySet(uint64 oldDelay, uint64 newDelay);
    event Frozen();

    // Views
    function routes(bytes4 selector) external view returns (address facet, bytes32 codehash);
    function pendingRoot() external view returns (bytes32);
    function pendingEpoch() external view returns (uint64);
    function pendingSince() external view returns (uint64);
    function activeRoot() external view returns (bytes32);
    function activeEpoch() external view returns (uint64);
    function activationDelay() external view returns (uint64);
    function frozen() external view returns (bool);

    function getManifestInfo() external view returns (ManifestInfo memory info);
    function verifyManifest(bytes32 manifestHash) external view returns (bool ok, bytes32 current);
    function getRoute(bytes4 selector) external view returns (address);
    function getRouteCount() external view returns (uint256);

    // Mutators
    function commitRoot(bytes32 newRoot, uint64 newEpoch) external;
    function applyRoutes(
        bytes4[] calldata selectors,
        address[] calldata facetAddrs,
        bytes32[] calldata codehashes,
        bytes32[][] calldata proofs,
        bool[][] calldata isRight
    ) external;

    function activateCommittedRoot() external;
    function removeRoutes(bytes4[] calldata selectors) external;
    function setActivationDelay(uint64 newDelay) external;
    function freeze() external;
    function pause() external;
    function unpause() external;
}

