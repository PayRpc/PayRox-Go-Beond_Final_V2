
// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IDiamondLoupeEx
/// @notice Extended loupe API for manifest/metadata/security without breaking EIP-2535.
/// @dev Implement alongside the standard IDiamondLoupe. Tools keep using the standard;
///      your apps call *Ex methods. Struct names are suffixed to avoid clashes.
interface IDiamondLoupeEx {
    // ---------- Structs (extended) ----------
    struct FacetEx {
        address facetAddress;
        bytes4[] functionSelectors;
        bytes32 versionTag;   // arbitrary tag (e.g., keccak256("v1.2.3"))
        uint8 securityLevel;  // 0=untrusted, 1=user, 2=admin, 3=system
    }

    struct FacetMetadata {
        string name;           // human-readable (optional)
        string category;       // optional
        string[] dependencies; // optional
        bool isUpgradeable;    // whether facet is meant to be replaceable
    }

    // ---------- Events (optional utility) ----------
    event SelectorConflict(bytes4 indexed selector, address existingFacet, address newFacet);

    // ---------- Extended queries (non-breaking) ----------
    function facetAddressesEx(bool includeUnsafe) external view returns (address[] memory addresses_);

    function facetFunctionSelectorsEx(address facet, uint8 minLevel) external view returns (bytes4[] memory selectors_);

    function facetsEx(bool includeMetadata) external view returns (FacetEx[] memory facets_);

    function facetAddressEx(bytes4 selector, bytes32 version) external view returns (address facet_);

    function facetAddressesBatchEx(bytes4[] calldata selectors) external view returns (address[] memory addresses_);

    // ---------- Fingerprints / provenance ----------
    /// @notice keccak256(runtime bytecode) a.k.a. EXTCODEHASH
    function facetHash(address facet) external view returns (bytes32);

    /// @notice keccak256(abi.encodePacked(facetHash, sortedSelectors))
    function selectorHash(address facet) external view returns (bytes32);

    /// @notice (deployer, timestamp) for provenance (0 if unknown)
    function facetProvenance(address facet) external view returns (address deployer, uint256 timestamp);

    // ---------- Optional extras ----------
    /// @dev Purely advisory; heavy to compute on-chain. Return empty if unsupported.
    function checkStorageConflicts(address facet) external view returns (bytes32[] memory conflicts_);

    /// @dev If a facet is a proxy, expose its implementation; else return address(0).
    function facetImplementation(address facet) external view returns (address implementation_);

    /// @dev Lightweight metadata (off-chain strings are fine; or return empty defaults).
    function facetMetadata(address facet) external view returns (FacetMetadata memory metadata_);
}
