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
}
