// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

interface IManifestDispatcher is IAccessControl {
    // ─────────────────────── Data types ───────────────────────
    struct Route {
        address facet;
        bytes32 codehash; // expected EXTCODEHASH(facet)
    }

    struct ManifestInfo {
        bytes32 hash;
        uint256 version;
        uint256 timestamp;
        uint256 selectorCount;
    }

    // ──────────────────────── Events ─────────────────────────
    event RootCommitted(bytes32 indexed root, uint64 indexed epoch);
    event RootActivated(bytes32 indexed root, uint64 indexed epoch);
    event RouteAdded(bytes4 indexed selector, address indexed facet, bytes32 codehash);
    event RouteRemoved(bytes4 indexed selector);
    event ActivationDelaySet(uint64 oldDelay, uint64 newDelay);
    event Frozen();

    // ───────────────────── Read-only views ────────────────────
    function routes(bytes4 selector) external view returns (address facet, bytes32 codehash);

    function pendingRoot() external view returns (bytes32);
    function pendingEpoch() external view returns (uint64);
    function pendingSince() external view returns (uint64);
    function activeRoot() external view returns (bytes32);
    function activeEpoch() external view returns (uint64);

    function activationDelay() external view returns (uint64);
    function frozen() external view returns (bool);

    // ───────────────── Manifest governance ────────────────────
    /**
     * Commit a new manifest root for epoch activeEpoch + 1.
     */
    function commitRoot(bytes32 newRoot, uint64 newEpoch) external;

    /**
     * Apply routes proven against the current pendingRoot.
     * Leaf = keccak256(abi.encode(selector, facet, codehash)).
     * Uses ordered-pair Merkle verification with position-aware proofs.
     */
    function applyRoutes(
        bytes4[] calldata selectors,
        address[] calldata facets,
        bytes32[] calldata codehashes,
        bytes32[][] calldata proofs,
        bool[][] calldata isRight
    ) external;

    /**
     * Activate the committed root (enforces optional activationDelay).
     */
    function activateCommittedRoot() external;

    // ──────────────── Emergency / configuration ───────────────
    function removeRoutes(bytes4[] calldata selectors) external;
    function setActivationDelay(uint64 newDelay) external;
    function freeze() external;

    // ────────────────── Operational control ───────────────────
    function pause() external;
    function unpause() external;

    // ─────────────────── Manifest info ────────────────────
    function getManifestInfo() external view returns (ManifestInfo memory info);
}
