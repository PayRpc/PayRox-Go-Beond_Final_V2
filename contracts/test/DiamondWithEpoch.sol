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
    mapping(uint64 => bytes4[]) private _epochSelectors;
    mapping(uint64 => mapping(bytes4 => bool)) private _epochSelectorSeen;
    mapping(uint64 => bool) private _clearedEpoch;
    mapping(bytes4 => address) private _routes; // current active routes
    mapping(address => bytes4[]) private _facetSelectors;
    address[] private _facetAddresses;
    bool public paused;

    struct RoutingHistoryEntry {
        address facetAddress;
        uint64 epoch;
    }
    mapping(bytes4 => RoutingHistoryEntry[]) private _routingHistory;
    uint64 private _lastProcessedEpoch;

    event CommitmentOverwritten(uint64 indexed epoch, bytes4 selector, address oldFacet, address newFacet);

    constructor(address _dispatcher, address _epochManager) {
        dispatcher = _dispatcher;
        epochManager = EpochManager(_epochManager);
        // Register this contract as a listener so advanceEpoch notifies us
        // (best-effort; epoch manager's registerListener is public in tests)
        try epochManager.registerListener(address(this)) {
            // noop
        } catch {
            // ignore if registration fails in some test setups
        }
        // Initialize last-processed marker to the current epoch
        _lastProcessedEpoch = epochManager.getCurrentEpoch();
    }

    // ===== Epoch-specific functions expected by tests =====
    
    function commitFacetUpdate(address facet, bytes4[] memory selectors, uint64 epoch) external {
        require(!paused, "System paused");
        uint64 currentEpoch = epochManager.getCurrentEpoch();
        // Only allow commits for next epoch
        if (epoch <= currentEpoch) revert("Can only commit to next epoch");
        if (epoch > currentEpoch + 1) revert("Epoch too far in future");
        for (uint256 i = 0; i < selectors.length; i++) {
            bytes4 sel = selectors[i];
            address old = commitments[epoch][sel];
            if (old != address(0) && old != facet) {
                emit CommitmentOverwritten(epoch, sel, old, facet);
            }
            commitments[epoch][sel] = facet;
            commitmentHistory[epoch][sel].push(facet);
            if (!_epochSelectorSeen[epoch][sel]) {
                _epochSelectorSeen[epoch][sel] = true;
                _epochSelectors[epoch].push(sel);
            }
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

    function validateEpochConsistency() external view returns (bool) {
    // If the epoch manager reports a current epoch that doesn't match the
    // last processed epoch (i.e. our onEpochAdvanced wasn't called), then
    // signal a desync. For tests we consider any mismatch a desync.
    // Note: external view cannot call epochManager in older solidity; using
    // external to keep test compatibility, but we'll perform the check
    // via a dynamic call.
    // Implemented as a revert on mismatch.
    uint64 managerEpoch = epochManager.getCurrentEpoch();
    if (managerEpoch != _lastProcessedEpoch) revert("Epoch desync detected");
    return true;
    }

    function emergencyPause() external {
        paused = true;
    }

    function emergencyEpochReset() external {
        require(msg.sender == dispatcher, "Only dispatcher can reset epochs");
        uint64 nextEpoch = epochManager.getCurrentEpoch() + 1;
        // Clear commitments for next epoch
        bytes4[] storage sels = _epochSelectors[nextEpoch];
        for (uint256 i = 0; i < sels.length; i++) {
            bytes4 sel = sels[i];
            delete commitments[nextEpoch][sel];
            delete commitmentHistory[nextEpoch][sel];
            _epochSelectorSeen[nextEpoch][sel] = false;
        }
        delete _epochSelectors[nextEpoch];
        _clearedEpoch[nextEpoch] = true;
    }

    function onEpochAdvanced(uint64 /*oldEpoch*/, uint64 newEpoch) external {
        // Activate any commitments for the new epoch
        // Only callable by the epoch manager (best-effort check)
        if (msg.sender != address(epochManager)) return;
        // If the epoch was cleared via emergency reset, skip activation
        if (_clearedEpoch[newEpoch]) {
            return;
        }
        bytes4[] storage sels = _epochSelectors[newEpoch];
    for (uint256 i = 0; i < sels.length; i++) {
            bytes4 sel = sels[i];
            address facet = commitments[newEpoch][sel];
            _routes[sel] = facet;
            // append routing history
            _routingHistory[sel].push(RoutingHistoryEntry({ facetAddress: facet, epoch: newEpoch }));
        }
    _lastProcessedEpoch = newEpoch;
        // Update last processed epoch marker (not stored separately but could be inferred)
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
