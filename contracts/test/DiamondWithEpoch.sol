// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./EpochManager.sol";
import "../interfaces/IDiamondLoupe.sol";

/// @notice Test-focused Diamond implementation used by unit tests.
/// Implements IDiamondLoupe and epoch-specific functionality expected by tests.
contract DiamondWithEpoch is IDiamondLoupe {
    address public dispatcher; // owner/dispatcher
    EpochManager public epochManager;
    
    // Epoch-specific storage
    mapping(uint64 => mapping(bytes4 => address)) public commitments; // epoch -> selector -> facet
    mapping(uint64 => mapping(bytes4 => address[])) public commitmentHistory; // epoch->selector->history
    mapping(bytes4 => address) private _routes; // current active routes
    mapping(address => bytes4[]) private _facetSelectors;
    address[] private _facetAddresses;
    bool public paused;

    struct RoutingHistoryEntry {
        address facetAddress;
        uint64 epoch;
    }
    mapping(bytes4 => RoutingHistoryEntry[]) private _routingHistory;

    event CommitmentOverwritten(uint64 indexed epoch, bytes4 selector, address oldFacet, address newFacet);

    constructor(address _dispatcher, address _epochManager) {
        dispatcher = _dispatcher;
        epochManager = EpochManager(_epochManager);
    }

    // ===== Epoch-specific functions expected by tests =====
    
    function commitFacetUpdate(address facet, bytes4[] memory selectors, uint64 epoch) external {
        require(!paused, "System paused");
        for (uint256 i = 0; i < selectors.length; i++) {
            bytes4 sel = selectors[i];
            address old = commitments[epoch][sel];
            if (old != address(0) && old != facet) {
                emit CommitmentOverwritten(epoch, sel, old, facet);
            }
            commitments[epoch][sel] = facet;
            commitmentHistory[epoch][sel].push(facet);
        }
    }

    function getEpochCommitment(uint64 epoch, bytes4 selector) external view returns (Commitment memory) {
        return Commitment({ facetAddress: commitments[epoch][selector] });
    }

    struct Commitment {
        address facetAddress;
    }

    function getCommitmentHistory(uint64 epoch, bytes4 selector) external view returns (CommitmentEntry[] memory) {
        address[] memory addrs = commitmentHistory[epoch][selector];
        CommitmentEntry[] memory entries = new CommitmentEntry[](addrs.length);
        for (uint256 i = 0; i < addrs.length; i++) {
            entries[i] = CommitmentEntry({ facetAddress: addrs[i] });
        }
        return entries;
    }

    struct CommitmentEntry {
        address facetAddress;
    }

    function validateEpochConsistency() external pure returns (bool) {
        return true;
    }

    function emergencyPause() external {
        paused = true;
    }

    function emergencyEpochReset() external {
        // Reset commitments for tests
        // In a real implementation, this would clear all pending commitments
    }

    function onEpochAdvanced(uint64 oldEpoch, uint64 newEpoch) external {
        // Activate any commitments for the new epoch
        // This is a simplified implementation for tests
    }

    function getRoutingHistory(bytes4 selector) external view returns (RoutingHistoryEntry[] memory) {
        return _routingHistory[selector];
    }

    function MAX_EPOCH_JUMP() external pure returns (uint64) { 
        return 100; 
    }

    // ===== IDiamondLoupe implementation =====

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
