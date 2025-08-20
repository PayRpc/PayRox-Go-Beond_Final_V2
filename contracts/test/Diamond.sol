// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../interfaces/IDiamondLoupe.sol";

contract Diamond is IDiamondLoupe {
    address public owner;
    mapping(bytes4 => address) private _routes;
    mapping(address => bytes4[]) private _facetSelectors;
    address[] private _facetAddresses;

    constructor(address _owner) {
        owner = _owner;
    }

    // IDiamondLoupe implementation
    function facets() external view override returns (Facet[] memory facets_) {
        uint256 n = _facetAddresses.length;
        facets_ = new Facet[](n);
        for (uint256 i = 0; i < n; i++) {
            address addr = _facetAddresses[i];
            facets_[i] = Facet({
                facetAddress: addr,
                functionSelectors: _facetSelectors[addr]
            });
        }
    }

    function facetFunctionSelectors(address _facet) external view override returns (bytes4[] memory) {
        return _facetSelectors[_facet];
    }

    function facetAddresses() external view override returns (address[] memory) {
        return _facetAddresses;
    }

    function facetAddress(bytes4 _functionSelector) external view override returns (address) {
        return _routes[_functionSelector];
    }

    // Test helper: register a facet and its selectors directly (used by tests)
    function addFacet(address _facet, bytes4[] calldata _selectors) external {
        // add facet address if not present
        bool present = false;
        for (uint256 i = 0; i < _facetAddresses.length; i++) {
            if (_facetAddresses[i] == _facet) {
                present = true;
                break;
            }
        }
        if (!present) {
            _facetAddresses.push(_facet);
        }

        // set selectors
        _facetSelectors[_facet] = _selectors;

        // map selectors to facet
        for (uint256 i = 0; i < _selectors.length; i++) {
            _routes[_selectors[i]] = _facet;
        }
    }

    // Minimal ERC-165 support for tests
    // Minimal ERC-165 support for tests
    // Return true for ERC-165 and IDiamondLoupe interface IDs so tests can query directly.
    function supportsInterface(bytes4 _interfaceId) external view returns (bool) {
        // ERC-165 interface ID
        if (_interfaceId == 0x01ffc9a7) return true;
        // IDiamondLoupe interface ID (computed off-chain in tests as 0x48e2b093)
        if (_interfaceId == 0x48e2b093) return true;
        return false;
    }
}
