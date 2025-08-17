// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./ManifestTypes.sol";

/// @notice Utilities operating on ManifestTypes structs.
/// Usage in a contract:
///   using ManifestUtils for ManifestTypes.GovernanceProposal;
///   proposal.applyVote(true, weight);
library ManifestUtils {
    // Note: governance quorum calculations use percentage-based threshold in the
    // orchestrator. The percent-based overload below is kept for that usage.

    /// @notice Overload used by GovernanceOrchestrator which passes a percentage quorum threshold (1-100)
    function checkGovernanceQuorum(
        ManifestTypes.GovernanceProposal memory proposal,
        uint256 totalSupply,
        uint256 quorumThresholdPercent
    ) internal pure returns (bool) {
        if (quorumThresholdPercent == 0 || quorumThresholdPercent > 100) {
            return false;
        }
        uint256 required = (totalSupply * quorumThresholdPercent) / 100;
        return proposal.forVotes >= required;
    }

    /// @notice Record/initialize audit metadata (storage mutation)
    /// @param audit Storage pointer to AuditInfo
    /// @param auditor Auditor address
    /// @param report Short report or URL
    /// @param passed Whether audit passed
    function recordAudit(
        ManifestTypes.AuditInfo storage audit,
        address auditor,
    string memory report,
        bool passed
    ) internal {
    audit.auditor = auditor;
    audit.auditTimestamp = block.timestamp;
    audit.reportUri = report;
    audit.passed = passed;
    }

    /// @notice Apply a vote to a proposal (storage mutation)
    /// @param proposal Storage pointer to GovernanceProposal
    /// @param support True for for-vote, false for against
    /// @param weight Voting weight to add
    function applyVote(
        ManifestTypes.GovernanceProposal storage proposal,
        bool support,
        uint256 weight
    ) internal {
        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }
    }

    /// @notice Helper to mark a proposal executed (storage mutation)
    function markExecuted(ManifestTypes.GovernanceProposal storage proposal) internal {
        proposal.executed = true;
    }

    /// @notice Verify basic audit integrity: auditHash matches provided manifestHash and auditor
    /// @dev This is a minimal check intended to mirror AuditRegistry usage. Returns true if hash derived matches.
    function verifyAudit(ManifestTypes.AuditInfo memory audit, bytes32 manifestHash) internal pure returns (bool) {
        // Recompute the expected auditHash from fields present in AuditInfo and compare
        // Note: This mirrors the AuditRegistry creation: keccak256(abi.encode(manifestHash, auditor, timestamp, reportUri))
        bytes32 expected = keccak256(abi.encode(manifestHash, audit.auditor, audit.auditTimestamp, audit.reportUri));
        return expected == audit.auditHash;
    }
}
