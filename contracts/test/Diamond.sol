// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../interfaces/IDiamondLoupe.sol";
import "./interfaces/IDiamondCut.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract Diamond is IDiamondLoupe, IDiamondCut, IERC165 {
    address public owner;
    mapping(bytes4 => address) private _routes;
    mapping(address => bytes4[]) private _facetSelectors;
    address[] private _facetAddresses;

    constructor(address _owner) {
        owner = _owner;
    }

    // IDiamondCut implementation
    function diamondCut(FacetCut[] calldata _diamondCut, address _init, bytes calldata _calldata) external override {
        require(msg.sender == owner, "Only owner can cut");
        
        for (uint256 i = 0; i < _diamondCut.length; i++) {
            FacetCut memory cut = _diamondCut[i];
            
            if (cut.action == FacetCutAction.Add) {
                _addFacet(cut.facetAddress, cut.functionSelectors);
            } else if (cut.action == FacetCutAction.Replace) {
                _replaceFacet(cut.facetAddress, cut.functionSelectors);
            } else if (cut.action == FacetCutAction.Remove) {
                _removeFacet(cut.functionSelectors);
            }
        }
        
        // Execute init call if provided
        if (_init != address(0)) {
            (bool success,) = _init.delegatecall(_calldata);
            require(success, "Init call failed");
        }
    }

    function _addFacet(address facetAddress, bytes4[] memory selectors) internal {
        require(facetAddress != address(0), "Invalid facet address");
        require(selectors.length > 0, "No selectors provided");
        
        // Add to facet addresses if not already present
        if (_facetSelectors[facetAddress].length == 0) {
            _facetAddresses.push(facetAddress);
        }
        
        // Add selectors
        for (uint256 i = 0; i < selectors.length; i++) {
            bytes4 selector = selectors[i];
            require(_routes[selector] == address(0), "Selector already exists");
            _routes[selector] = facetAddress;
            _facetSelectors[facetAddress].push(selector);
        }
    }
    
    function _replaceFacet(address facetAddress, bytes4[] memory selectors) internal {
        require(facetAddress != address(0), "Invalid facet address");
        require(selectors.length > 0, "No selectors provided");
        
        for (uint256 i = 0; i < selectors.length; i++) {
            bytes4 selector = selectors[i];
            address oldFacet = _routes[selector];
            require(oldFacet != address(0), "Selector doesn't exist");
            
            // Remove from old facet
            _removeSelector(oldFacet, selector);
            
            // Add to new facet
            _routes[selector] = facetAddress;
            if (_facetSelectors[facetAddress].length == 0) {
                _facetAddresses.push(facetAddress);
            }
            _facetSelectors[facetAddress].push(selector);
        }
    }
    
    function _removeFacet(bytes4[] memory selectors) internal {
        for (uint256 i = 0; i < selectors.length; i++) {
            bytes4 selector = selectors[i];
            address facetAddress = _routes[selector];
            require(facetAddress != address(0), "Selector doesn't exist");
            
            _removeSelector(facetAddress, selector);
            delete _routes[selector];
        }
    }
    
    function _removeSelector(address facetAddress, bytes4 selector) internal {
        bytes4[] storage selectors = _facetSelectors[facetAddress];
        for (uint256 i = 0; i < selectors.length; i++) {
            if (selectors[i] == selector) {
                selectors[i] = selectors[selectors.length - 1];
                selectors.pop();
                break;
            }
        }
        
        // Remove facet from addresses array if no selectors left
        if (selectors.length == 0) {
            for (uint256 i = 0; i < _facetAddresses.length; i++) {
                if (_facetAddresses[i] == facetAddress) {
                    _facetAddresses[i] = _facetAddresses[_facetAddresses.length - 1];
                    _facetAddresses.pop();
                    break;
                }
            }
        }
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

    // IERC165 implementation
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IDiamondLoupe).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
