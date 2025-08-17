// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Centralized manifest types (namespace-like library)
library ManifestTypes {
    /// @notice Audit metadata recorded for an artifact
    struct AuditInfo {
        address auditor;
    bytes32 auditHash;
    uint256 auditTimestamp;
    bool passed;
    string reportUri; // short summary or URL or URI
    }

    /// @notice Simple governance proposal summary used across orchestrators
    struct GovernanceProposal {
    bytes32 proposalId;
    address proposer;
    string description;
    bytes32[] targetHashes;
    uint256 votingDeadline;
    uint256 forVotes;
    uint256 againstVotes;
    uint256 abstainVotes;
    bool executed;
    }

    // Events
    event GovernanceProposalCreated(
        bytes32 indexed id,
        address indexed proposer,
        uint256 startBlock,
        uint256 endBlock,
        uint16 quorumBps
    );

    event GovernanceVoteCast(
        bytes32 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );

    event AuditRegistered(bytes32 indexed auditId, address indexed auditor, bool passed);
    event AuditCompleted(bytes32 indexed manifestHash, address indexed auditor, bool passed);

    // Errors
    error UnauthorizedDeployer();
    error ProposalNotFound(bytes32 proposalId);
    error QuorumNotReached(bytes32 proposalId, uint256 forVotes, uint256 quorumRequired);
}
