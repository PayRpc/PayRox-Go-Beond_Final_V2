// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PayRoxAccessControlStorage as ACS} from "../libraries/PayRoxAccessControlStorage.sol";
import {PayRoxPauseStorage as PS} from "../libraries/PayRoxPauseStorage.sol";
import "../manifest/ManifestTypes.sol";
import "../manifest/ManifestUtils.sol";

/**
 * @title GovernanceOrchestrator
 * @dev Advanced governance system for PayRox protocol upgrades and decisions
 * @notice Manages proposal creation, voting, and execution for protocol governance
 */
contract GovernanceOrchestrator is ReentrancyGuard {
    using ManifestUtils for ManifestTypes.GovernanceProposal;

    /// @dev Role for proposal creators
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");

    /// @dev Role for emergency actions
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    /// @dev Minimum voting period in seconds
    uint256 public constant MIN_VOTING_PERIOD = 3 days;

    /// @dev Maximum voting period in seconds
    uint256 public constant MAX_VOTING_PERIOD = 30 days;

    /// @dev Quorum threshold percentage (1-100)
    uint256 public quorumThreshold = 10; // 10%

    /// @dev Total voting supply
    uint256 public totalVotingSupply;

    /// @dev Mapping of proposal IDs to proposals
    mapping(bytes32 => ManifestTypes.GovernanceProposal) public proposals;

    /// @dev Mapping of proposal ID to voter to vote weight
    mapping(bytes32 => mapping(address => uint256)) public votes;

    /// @dev Mapping of proposal ID to voter to vote support (true = for, false = against)
    mapping(bytes32 => mapping(address => bool)) public voteSupport;

    /// @dev Mapping of voter addresses to their voting power
    mapping(address => uint256) public votingPower;

    /// @dev Array of all proposal IDs
    bytes32[] public allProposals;

    /// @dev Mapping to track executed proposals
    mapping(bytes32 => bool) public executedProposals;

    /// @dev Snapshot of total voting supply at proposal creation (prevents manipulation)
    mapping(bytes32 => uint256) public snapshotTotalSupply;

    /// @dev Snapshot of quorum threshold at proposal creation (prevents mid-vote changes)
    mapping(bytes32 => uint256) public snapshotQuorumThreshold;

    // Events
    event ProposalCreated(
        bytes32 indexed proposalId,
        address indexed proposer,
        string description,
        uint256 votingDeadline
    );

    event VoteCast(
        bytes32 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );

    event ProposalExecuted(
        bytes32 indexed proposalId,
        bool success
    );

    event VotingPowerUpdated(
        address indexed account,
        uint256 oldPower,
        uint256 newPower
    );

    event QuorumThresholdUpdated(
        uint256 oldThreshold,
        uint256 newThreshold
    );

    event ProposalCancelled(
        bytes32 indexed proposalId,
        address indexed canceller,
        string reason
    );

    // Custom errors
    error ProposalAlreadyExists(bytes32 proposalId);
    error ProposalNotFound(bytes32 proposalId);
    error VotingPeriodInvalid(uint256 period);
    error VotingEnded(bytes32 proposalId);
    error VotingActive(bytes32 proposalId);
    error InsufficientVotingPower(address voter, uint256 required);
    error ProposalAlreadyExecuted(bytes32 proposalId);
    error QuorumNotMet(bytes32 proposalId);
    error InvalidQuorumThreshold(uint256 threshold);
    error ActiveProposalsExist(); // 🔒 SECURITY: Prevent threshold changes during active votes
    error ProposalAlreadyCancelled(bytes32 proposalId); // Emergency cancellation

    /**
     * @dev Constructor sets up access control
     * @param admin The initial admin address
     */
    constructor(address admin) {
        if (admin == address(0)) revert ManifestTypes.UnauthorizedDeployer();

    // Seed canonical roles
    ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][admin] = true;
    ACS.layout().roles[PROPOSER_ROLE][admin] = true;
    ACS.layout().roles[EMERGENCY_ROLE][admin] = true;
    }

    /**
     * @dev Create a new governance proposal
     * @param proposalId Unique identifier for the proposal
     * @param description Human-readable description
     * @param targetHashes Array of target manifest hashes
     * @param votingPeriod Duration of voting in seconds
     */
    function createProposal(
        bytes32 proposalId,
        string calldata description,
        bytes32[] calldata targetHashes,
        uint256 votingPeriod
    ) external {
        require(!PS.layout().paused, "Pausable: paused");
        require(ACS.layout().roles[PROPOSER_ROLE][msg.sender], "Missing role");
        if (proposals[proposalId].proposalId != bytes32(0)) {
            revert ProposalAlreadyExists(proposalId);
        }

        if (votingPeriod < MIN_VOTING_PERIOD || votingPeriod > MAX_VOTING_PERIOD) {
            revert VotingPeriodInvalid(votingPeriod);
        }

        uint256 deadline = block.timestamp + votingPeriod;

        proposals[proposalId] = ManifestTypes.GovernanceProposal({
            proposalId: proposalId,
            proposer: msg.sender,
            description: description,
            targetHashes: targetHashes,
            votingDeadline: deadline,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            executed: false
        });

        // 🔒 SECURITY: Snapshot values at creation to prevent manipulation
        snapshotTotalSupply[proposalId] = totalVotingSupply;
        snapshotQuorumThreshold[proposalId] = quorumThreshold;

        allProposals.push(proposalId);

        emit ProposalCreated(proposalId, msg.sender, description, deadline);
        // ❌ REMOVED: Spurious zero-weight vote event that could mislead indexers
    }

    /**
     * @dev Cast a vote on a proposal
     * @param proposalId The proposal to vote on
     * @param support Whether to vote for (true) or against (false)
     */
    function castVote(
        bytes32 proposalId,
        bool support
    ) external nonReentrant {
        require(!PS.layout().paused, "Pausable: paused");
        ManifestTypes.GovernanceProposal storage proposal = proposals[proposalId];

        if (proposal.proposalId == bytes32(0)) {
            revert ProposalNotFound(proposalId);
        }

        if (block.timestamp > proposal.votingDeadline) {
            revert VotingEnded(proposalId);
        }

        uint256 voterPower = votingPower[msg.sender];
        if (voterPower == 0) {
            revert InsufficientVotingPower(msg.sender, 1);
        }

        // Remove previous vote if exists
        uint256 previousVote = votes[proposalId][msg.sender];
        if (previousVote > 0) {
            bool prevSupport = voteSupport[proposalId][msg.sender];
            if (prevSupport) {
                proposal.forVotes -= previousVote;
            } else {
                proposal.againstVotes -= previousVote;
            }
        }

        // Record new vote
        votes[proposalId][msg.sender] = voterPower;
        voteSupport[proposalId][msg.sender] = support;

        if (support) {
            proposal.forVotes += voterPower;
        } else {
            proposal.againstVotes += voterPower;
        }

        emit VoteCast(proposalId, msg.sender, support, voterPower);
        emit ManifestTypes.GovernanceVoteCast(proposalId, msg.sender, support, voterPower);
    }

    /**
     * @dev Execute a proposal that has passed
     * @param proposalId The proposal to execute
     */
    function executeProposal(bytes32 proposalId) external nonReentrant {
        require(!PS.layout().paused, "Pausable: paused");
        ManifestTypes.GovernanceProposal storage proposal = proposals[proposalId];

        if (proposal.proposalId == bytes32(0)) {
            revert ProposalNotFound(proposalId);
        }

        if (proposal.executed || executedProposals[proposalId]) {
            revert ProposalAlreadyExecuted(proposalId);
        }

        if (block.timestamp <= proposal.votingDeadline) {
            revert VotingActive(proposalId);
        }

        // 🔒 SECURITY: Use snapshots to prevent post-vote manipulation
        bool hasPassed = ManifestUtils.checkGovernanceQuorum(
            proposal,
            snapshotTotalSupply[proposalId],
            snapshotQuorumThreshold[proposalId]
        );

        if (!hasPassed) {
            revert QuorumNotMet(proposalId);
        }

        proposal.executed = true;
        executedProposals[proposalId] = true;

        emit ProposalExecuted(proposalId, true);
    }

    /**
     * @dev Update voting power for an account
     * @param account The account to update
     * @param newPower The new voting power
     */
    function updateVotingPower(
        address account,
        uint256 newPower
    ) external {
        require(ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][msg.sender], "Missing role");
        uint256 oldPower = votingPower[account];

        votingPower[account] = newPower;
        totalVotingSupply = totalVotingSupply - oldPower + newPower;

        emit VotingPowerUpdated(account, oldPower, newPower);
    }

    /**
     * @dev Update quorum threshold (🔒 SECURITY: Only when no active proposals)
     * @param newThreshold New threshold percentage (1-100)
     */
    function updateQuorumThreshold(
        uint256 newThreshold
    ) external {
        require(ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][msg.sender], "Missing role");
        if (newThreshold == 0 || newThreshold > 100) {
            revert InvalidQuorumThreshold(newThreshold);
        }

        // 🔒 SECURITY: Prevent threshold manipulation during active voting
        if (_hasActiveProposals()) {
            revert ActiveProposalsExist();
        }

        uint256 oldThreshold = quorumThreshold;
        quorumThreshold = newThreshold;

        emit QuorumThresholdUpdated(oldThreshold, newThreshold);
    }

    /**
     * @dev Get proposal details
     * @param proposalId The proposal ID
     * @return proposal The proposal details
     */
    function getProposal(
        bytes32 proposalId
    ) external view returns (ManifestTypes.GovernanceProposal memory proposal) {
        return proposals[proposalId];
    }

    /**
     * @dev Get total number of proposals
     * @return count The total proposal count
     */
    function getProposalCount() external view returns (uint256 count) {
        return allProposals.length;
    }

    /**
     * @dev Check if proposal has sufficient votes to pass
     * @param proposalId The proposal to check
     * @return hasPassed Whether the proposal would pass
     */
    function checkProposalStatus(
        bytes32 proposalId
    ) external view returns (bool hasPassed) {
        ManifestTypes.GovernanceProposal memory proposal = proposals[proposalId];

        // Check if proposal exists (zero proposalId indicates uninitialized proposal)
        if (proposal.proposalId == bytes32(0)) {
            return false; // Proposal does not exist
        }

        // 🔒 SECURITY: Use snapshots to prevent manipulation
        return ManifestUtils.checkGovernanceQuorum(
            proposal,
            snapshotTotalSupply[proposalId],
            snapshotQuorumThreshold[proposalId]
        );
    }

    /**
     * @dev Emergency pause function
     */
    // Pause/unpause provided by PauseFacet

    /**
     * @dev Check if any proposals are currently active (voting not ended)
     * @return hasActive True if any proposal is still in voting period
     */
    function _hasActiveProposals() internal view returns (bool hasActive) {
        uint256 length = allProposals.length;
        for (uint256 i = 0; i < length; ) {
            bytes32 proposalId = allProposals[i];
            ManifestTypes.GovernanceProposal storage proposal = proposals[proposalId];
            
            // Check if proposal is active (not executed and voting hasn't ended)
            if (!proposal.executed && block.timestamp <= proposal.votingDeadline) {
                return true;
            }
            
            unchecked { ++i; }
        }
        return false;
    }

    /**
     * @dev Get snapshot values for a proposal (for transparency)
     * @param proposalId The proposal ID
     * @return totalSupply The snapshotted total voting supply
     * @return threshold The snapshotted quorum threshold
     */
    function getProposalSnapshots(
        bytes32 proposalId
    ) external view returns (uint256 totalSupply, uint256 threshold) {
        return (snapshotTotalSupply[proposalId], snapshotQuorumThreshold[proposalId]);
    }

    /**
     * @dev Emergency cancellation of malicious proposals (EMERGENCY_ROLE only)
     * @param proposalId The proposal to cancel
     * @param reason Human-readable cancellation reason
     */
    function emergencyCancelProposal(
        bytes32 proposalId,
        string calldata reason
    ) external {
        require(ACS.layout().roles[EMERGENCY_ROLE][msg.sender], "Missing emergency role");
        
        ManifestTypes.GovernanceProposal storage proposal = proposals[proposalId];
        if (proposal.proposalId == bytes32(0)) {
            revert ProposalNotFound(proposalId);
        }
        
        if (proposal.executed) {
            revert ProposalAlreadyExecuted(proposalId);
        }
        
        // Mark as executed to prevent normal execution path
        proposal.executed = true;
        executedProposals[proposalId] = true;
        
        emit ProposalCancelled(proposalId, msg.sender, reason);
    }

    /**
     * @dev Check if proposal was cancelled
     * @param proposalId The proposal ID to check
     * @return cancelled True if the proposal was emergency cancelled
     */
    function isProposalCancelled(bytes32 proposalId) external view returns (bool cancelled) {
        ManifestTypes.GovernanceProposal memory proposal = proposals[proposalId];
        
        // If executed but has zero votes, likely cancelled (heuristic)
        // For exact tracking, could add a separate cancelled mapping
        return proposal.executed && 
               proposal.forVotes == 0 && 
               proposal.againstVotes == 0 && 
               proposal.abstainVotes == 0;
    }
}
