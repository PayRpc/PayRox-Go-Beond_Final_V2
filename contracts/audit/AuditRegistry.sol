// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../manifest/ManifestTypes.sol";
import "../manifest/ManifestUtils.sol";

/**
 * @title AuditRegistry
 * @dev Registry for managing security audits of PayRox manifests and contracts
 * @notice Tracks audit status, manages auditor credentials, and validates audit reports
 */
contract AuditRegistry is AccessControl, Pausable {
    using ManifestUtils for ManifestTypes.AuditInfo;

    /// @dev Role for certified auditors
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    /// @dev Role for audit administrators
    bytes32 public constant AUDIT_ADMIN_ROLE = keccak256("AUDIT_ADMIN_ROLE");

    /// @dev Minimum audit validity period in seconds
    uint256 public constant MIN_AUDIT_VALIDITY = 30 days;

    /// @dev Maximum audit validity period in seconds
    uint256 public constant MAX_AUDIT_VALIDITY = 365 days;

    /// @dev Default audit validity period
    uint256 public auditValidityPeriod = 90 days;

    /// @dev Mapping of manifest hash to audit information
    mapping(bytes32 => ManifestTypes.AuditInfo) public audits;

    /// @dev Mapping of auditor to their certification status
    mapping(address => bool) public certifiedAuditors;

    /// @dev Mapping of auditor to their audit count
    mapping(address => uint256) public auditorStats;

    /// @dev Array of all audited manifest hashes
    bytes32[] public auditedManifests;

    /// @dev Mapping to track audit expiration
    mapping(bytes32 => uint256) public auditExpiration;

    // Events
    event AuditSubmitted(
        bytes32 indexed manifestHash,
        address indexed auditor,
        bool passed,
        string reportUri
    );

    event AuditorCertified(
        address indexed auditor,
        address indexed certifier
    );

    event AuditorRevoked(
        address indexed auditor,
        address indexed revoker
    );

    event AuditValidityUpdated(
        uint256 oldPeriod,
        uint256 newPeriod
    );

    event AuditExpired(
        bytes32 indexed manifestHash,
        address indexed auditor
    );

    // Custom errors
    error AuditorNotCertified(address auditor);
    error AuditAlreadyExists(bytes32 manifestHash);
    error AuditNotFound(bytes32 manifestHash);
    error InvalidAuditPeriod(uint256 period);
    error AuditExpiredError(bytes32 manifestHash);
    error InvalidReportUri(string uri);
    error AuditorAlreadyCertified(address auditor);

    /**
     * @dev Constructor sets up access control
     * @param admin The initial admin address
     */
    constructor(address admin) {
        if (admin == address(0)) revert ManifestTypes.UnauthorizedDeployer();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AUDIT_ADMIN_ROLE, admin);
        _grantRole(AUDITOR_ROLE, admin);

        certifiedAuditors[admin] = true;
    }

    /**
     * @dev Submit an audit report for a manifest
     * @param manifestHash The hash of the manifest being audited
     * @param passed Whether the audit passed
     * @param reportUri URI pointing to the detailed audit report
     */
    function submitAudit(
        bytes32 manifestHash,
        bool passed,
        string calldata reportUri
    ) external onlyRole(AUDITOR_ROLE) whenNotPaused {
        if (!certifiedAuditors[msg.sender]) {
            revert AuditorNotCertified(msg.sender);
        }

        if (audits[manifestHash].auditor != address(0)) {
            revert AuditAlreadyExists(manifestHash);
        }

        if (bytes(reportUri).length == 0) {
            revert InvalidReportUri(reportUri);
        }

        // Create audit hash for verification
        bytes32 auditHash = keccak256(abi.encode(
            manifestHash,
            msg.sender,
            block.timestamp,
            reportUri
        ));

        ManifestTypes.AuditInfo memory auditInfo = ManifestTypes.AuditInfo({
            auditor: msg.sender,
            auditHash: auditHash,
            auditTimestamp: block.timestamp,
            passed: passed,
            reportUri: reportUri
        });

        // Verify the audit info is valid
        require(
            ManifestUtils.verifyAudit(auditInfo, manifestHash),
            "AuditRegistry: invalid audit information"
        );

        audits[manifestHash] = auditInfo;
        auditExpiration[manifestHash] = block.timestamp + auditValidityPeriod;
        auditedManifests.push(manifestHash);
        auditorStats[msg.sender]++;

        emit AuditSubmitted(manifestHash, msg.sender, passed, reportUri);
        emit ManifestTypes.AuditCompleted(manifestHash, msg.sender, passed);
    }

    /**
     * @dev Certify a new auditor
     * @param auditor The address to certify as an auditor
     */
    function certifyAuditor(
        address auditor
    ) external onlyRole(AUDIT_ADMIN_ROLE) {
        if (auditor == address(0)) {
            revert ManifestTypes.UnauthorizedDeployer();
        }

        if (certifiedAuditors[auditor]) {
            revert AuditorAlreadyCertified(auditor);
        }

        certifiedAuditors[auditor] = true;
        _grantRole(AUDITOR_ROLE, auditor);

        emit AuditorCertified(auditor, msg.sender);
    }

    /**
     * @dev Revoke auditor certification
     * @param auditor The address to revoke certification from
     */
    function revokeAuditor(
        address auditor
    ) external onlyRole(AUDIT_ADMIN_ROLE) {
        if (!certifiedAuditors[auditor]) {
            revert AuditorNotCertified(auditor);
        }

        certifiedAuditors[auditor] = false;
        _revokeRole(AUDITOR_ROLE, auditor);

        emit AuditorRevoked(auditor, msg.sender);
    }

    /**
     * @dev Update audit validity period
     * @param newPeriod New validity period in seconds
     */
    function updateAuditValidityPeriod(
        uint256 newPeriod
    ) external onlyRole(AUDIT_ADMIN_ROLE) {
        if (newPeriod < MIN_AUDIT_VALIDITY || newPeriod > MAX_AUDIT_VALIDITY) {
            revert InvalidAuditPeriod(newPeriod);
        }

        uint256 oldPeriod = auditValidityPeriod;
        auditValidityPeriod = newPeriod;

        emit AuditValidityUpdated(oldPeriod, newPeriod);
    }

    /**
     * @dev Check if an audit is valid and not expired
     * @param manifestHash The manifest hash to check
     * @return isValid Whether the audit is valid
     * @return auditInfo The audit information
     */
    function getAuditStatus(
        bytes32 manifestHash
    ) external view returns (bool isValid, ManifestTypes.AuditInfo memory auditInfo) {
        auditInfo = audits[manifestHash];

        if (auditInfo.auditor == address(0)) {
            return (false, auditInfo);
        }

        // Check if audit has expired
        if (block.timestamp > auditExpiration[manifestHash]) {
            return (false, auditInfo);
        }

        // Check if auditor is still certified
        if (!certifiedAuditors[auditInfo.auditor]) {
            return (false, auditInfo);
        }

        // Verify audit integrity
        bool verified = ManifestUtils.verifyAudit(auditInfo, manifestHash);

        return (verified && auditInfo.passed, auditInfo);
    }

    /**
     * @dev Check if a manifest requires audit
     * @param manifestHash The manifest to check
     * @return auditRequired Whether an audit is required
     */
    function requiresAudit(bytes32 manifestHash) external view returns (bool auditRequired) {
        (bool isValid,) = this.getAuditStatus(manifestHash);
        return !isValid;
    }

    /**
     * @dev Get auditor statistics
     * @param auditor The auditor address
     * @return isCertified Whether the auditor is certified
     * @return auditCount Number of audits performed
     */
    function getAuditorInfo(
        address auditor
    ) external view returns (bool isCertified, uint256 auditCount) {
        return (certifiedAuditors[auditor], auditorStats[auditor]);
    }

    /**
     * @dev Get total number of audited manifests
     * @return count The total count
     */
    function getAuditCount() external view returns (uint256 count) {
        return auditedManifests.length;
    }

    /**
     * @dev Get paginated list of audited manifests
     * @param offset Starting index
     * @param limit Maximum number of results
     * @return manifests Array of manifest hashes
     * @return total Total number of audited manifests
     */
    function getAuditedManifests(
        uint256 offset,
        uint256 limit
    ) external view returns (bytes32[] memory manifests, uint256 total) {
        total = auditedManifests.length;

        if (offset >= total) {
            return (new bytes32[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        manifests = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            manifests[i - offset] = auditedManifests[i];
        }
    }

    /**
     * @dev Emergency function to mark expired audits
     * @param manifestHashes Array of manifest hashes to check
     */
    function markExpiredAudits(
        bytes32[] calldata manifestHashes
    ) external onlyRole(AUDIT_ADMIN_ROLE) {
        for (uint256 i = 0; i < manifestHashes.length; i++) {
            bytes32 manifestHash = manifestHashes[i];

            if (block.timestamp > auditExpiration[manifestHash] &&
                audits[manifestHash].auditor != address(0)) {

                emit AuditExpired(manifestHash, audits[manifestHash].auditor);
            }
        }
    }

    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Emergency unpause function
     */
    function emergencyUnpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
