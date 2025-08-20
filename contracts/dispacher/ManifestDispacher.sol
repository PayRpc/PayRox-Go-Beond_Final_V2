// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PayRoxAccessControlStorage as ACS} from "../libraries/PayRoxAccessControlStorage.sol";
import {PayRoxPauseStorage as PS} from "../libraries/PayRoxPauseStorage.sol";

// Updated, explicit interface paths
import {IManifestDispatcher} from "../interfaces/IManifestDispatcher.sol";
import {IDiamondLoupe}       from "../interfaces/IDiamondLoupe.sol";
import {IDiamondLoupeEx}     from "../interfaces/IDiamondLoupeEx.sol";

import {OrderedMerkle}       from "../utils/OrderedMerkle.sol";
import {RefactorSafetyLib}   from "../libraries/RefactorSafetyLib.sol";

/**
 * @title ManifestDispatcher (compact)
 * @notice Manifest-routed modular proxy (non-EIP-2535 cuts) with EXTCODEHASH gating.
 * @dev Core functionality only: commit/apply/activate, pause/freeze, EIP-2535 Loupe + Enhanced Loupe (Ex).
 */
contract ManifestDispatcher is
    IManifestDispatcher,
    IDiamondLoupe,   // standard EIP-2535 loupe
    IDiamondLoupeEx, // enhanced loupe (Ex)
    ReentrancyGuard
{
    // ───────────────────────────────────────────────────────────────────────────
    // Roles
    // ───────────────────────────────────────────────────────────────────────────
    bytes32 public constant COMMIT_ROLE    = keccak256("COMMIT_ROLE");
    bytes32 public constant APPLY_ROLE     = keccak256("APPLY_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // ───────────────────────────────────────────────────────────────────────────
    // Limits
    // ───────────────────────────────────────────────────────────────────────────
    uint256 private constant MAX_BATCH = 100;
    uint256 private constant MAX_FACET_CODE = 24_576; // EIP-170 limit
    uint64  private constant MAX_ACTIVATION_DELAY = 365 days; // governance safety bound

    // ───────────────────────────────────────────────────────────────────────────
    // Storage
    // ───────────────────────────────────────────────────────────────────────────
    struct ManifestState {
        bytes32 activeRoot;      // current manifest root
        bytes32 pendingRoot;     // committed (not yet active) root
        uint64  activeEpoch;     // current epoch
        uint64  committedAt;     // when pendingRoot was set
        uint64  activationDelay; // governance delay
        uint64  manifestVersion; // bump on every apply/activate
        bool    frozen;          // one-way lock of governance mutators
    }
    ManifestState public manifest;

    // selector → Route
    mapping(bytes4 => IManifestDispatcher.Route) private _routes;
    // selector registry
    mapping(bytes4 => bool) public registeredSelectors;

    // Loupe registries
    mapping(address => bytes4[]) public facetSelectors;
    address[] private _facetAddresses;
    uint256   public routeCount;

    // Enhanced Loupe (Ex) metadata (lightweight)
    mapping(address => uint8)   private _facetSecurityLevel; // default 1=user
    mapping(address => bytes32) private _facetVersionTag;    // default 0x0 (unspecified)
    mapping(address => address) private _facetDeployer;      // provenance (first registrar)
    mapping(address => uint64)  private _facetDeployedAt;    // provenance timestamp

    // Dev registrar control for production safety
    bool private devRegistrarEnabled;

    // ───────────────────────────────────────────────────────────────────────────
    // Errors
    // ───────────────────────────────────────────────────────────────────────────
    error FrozenContract();
    error NoRoute();
    error CodehashMismatch();
    error RootZero();
    error BadEpoch();
    error NoPendingRoot();
    error ActivationNotReady(uint64 earliest, uint64 nowTs);
    error BatchTooLarge(uint256 n);
    error LenMismatch();
    error FacetIsSelf();
    error ZeroAddress();
    error ZeroCodeFacet(address facet);
    error CodeSizeExceeded(address facet, uint256 size);
    error FacetCodeMismatch(address facet, bytes32 expected, bytes32 actual);
    error DuplicateSelector(bytes4 selector);
    error InvalidProof();
    error ActivationDelayOutOfRange(uint64 newDelay);
    error InvalidSecurityLevel(uint8 level);
    error FacetUnknown(address facet);
    error DevOnly();

    // ───────────────────────────────────────────────────────────────────────────
    // Events (contract-specific + some from interfaces are reused)
    // ───────────────────────────────────────────────────────────────────────────
    event ManifestVersionUpdated(uint64 indexed oldVersion, uint64 indexed newVersion);
    event RoutesRemoved(bytes4[] selectors);
    event RouteUpdated(bytes4 indexed selector, address indexed oldFacet, address indexed newFacet);
    event FacetSecurityLevelSet(address indexed facet, uint8 level);
    event FacetVersionTagSet(address indexed facet, bytes32 versionTag);
    event L2TimestampWarning(uint64 activationTime, uint64 delay); // L2 governance timing alert
    event DevRegistrarToggled(bool enabled);

    // ───────────────────────────────────────────────────────────────────────────
    // Constructor
    // ───────────────────────────────────────────────────────────────────────────
    constructor(address admin, uint64 activationDelaySeconds) {
        if (admin == address(0)) revert ZeroAddress();
        // Enforce reasonable upper bound at deploy time
        if (activationDelaySeconds > MAX_ACTIVATION_DELAY) revert ActivationDelayOutOfRange(activationDelaySeconds);

    // Seed canonical roles
    ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][admin] = true;
    ACS.layout().roles[COMMIT_ROLE][admin] = true;
    ACS.layout().roles[APPLY_ROLE][admin] = true;
    ACS.layout().roles[EMERGENCY_ROLE][admin] = true;

        manifest.activationDelay = activationDelaySeconds;
        manifest.manifestVersion = 1;
        devRegistrarEnabled = false; // Default to disabled for production safety
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Routing (fallback/receive)
    // ───────────────────────────────────────────────────────────────────────────
    receive() external payable {}

    fallback() external payable {
        require(!PS.layout().paused, "Pausable: paused");
        bytes4 selector = msg.sig;
        IManifestDispatcher.Route storage r = _routes[selector];
        address facet = r.facet;
        if (facet == address(0)) revert NoRoute();

        // EXTCODEHASH equality gate on every call
        if (facet.codehash != r.codehash) revert CodehashMismatch();

        assembly {
            calldatacopy(0, 0, calldatasize())
            let ok := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            let sz := returndatasize()
            returndatacopy(0, 0, sz)
            switch ok
            case 0 { revert(0, sz) }
            default { return(0, sz) }
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Views (IManifestDispatcher)
    // ───────────────────────────────────────────────────────────────────────────
    function routes(bytes4 selector) external view override returns (address facet, bytes32 codehash) {
        IManifestDispatcher.Route storage r = _routes[selector];
        return (r.facet, r.codehash);
    }

    function pendingRoot()     external view override returns (bytes32) { return manifest.pendingRoot; }
    function pendingEpoch()    external view override returns (uint64)  { return manifest.activeEpoch + 1; }
    function pendingSince()    external view override returns (uint64)  { return manifest.committedAt; }
    function activeRoot()      external view override returns (bytes32) { return manifest.activeRoot; }
    function activeEpoch()     external view override returns (uint64)  { return manifest.activeEpoch; }
    function activationDelay() external view override returns (uint64)  { return manifest.activationDelay; }
    function frozen()          external view override returns (bool)    { return manifest.frozen; }

    function getManifestVersion() external view returns (uint64) { return manifest.manifestVersion; }
    function getRoute(bytes4 selector) external view returns (address) { return _routes[selector].facet; }
    function getRouteCount() external view returns (uint256) { return routeCount; }

    // New lightweight getters for facet metadata and limits
    function facetSecurityLevel(address facet) external view returns (uint8) {
        return _facetSecurityLevel[facet];
    }

    function facetVersionTag(address facet) external view returns (bytes32) {
        return _facetVersionTag[facet];
    }

    function getLimits() external pure returns (uint256 maxBatch, uint256 maxFacetCode, uint64 maxActivationDelay) {
        return (MAX_BATCH, MAX_FACET_CODE, MAX_ACTIVATION_DELAY);
    }

    function verifyManifest(bytes32 manifestHash) external view returns (bool ok, bytes32 current) {
        current = manifest.activeRoot; ok = (manifestHash == current);
    }

    function isDevRegistrarEnabled() external view returns (bool) {
        return devRegistrarEnabled;
    }

    function getManifestInfo()
        external
        view
        override
        returns (IManifestDispatcher.ManifestInfo memory info)
    {
        info = IManifestDispatcher.ManifestInfo({
            hash:          manifest.activeRoot,
            version:       manifest.manifestVersion,
            timestamp:     uint64(block.timestamp),
            selectorCount: routeCount
        });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Manifest lifecycle
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Commit a new manifest root for the next epoch (last write wins).
    function commitRoot(bytes32 newRoot, uint64 newEpoch)
        external
        override
    {
        require(ACS.layout().roles[COMMIT_ROLE][msg.sender], "Missing role");
        require(!PS.layout().paused, "Pausable: paused");
        if (manifest.frozen) revert FrozenContract();
        if (newRoot == bytes32(0)) revert RootZero();
        if (newEpoch != manifest.activeEpoch + 1) revert BadEpoch();

        manifest.pendingRoot = newRoot;
        manifest.committedAt = uint64(block.timestamp);

        emit RootCommitted(newRoot, newEpoch);
    }

    /// @notice Apply route updates proven against the committed root.
    function applyRoutes(
        bytes4[] calldata selectors,
        address[] calldata facetAddrs,
        bytes32[] calldata codehashes,
        bytes32[][] calldata proofs,
        bool[][]   calldata isRight
    )
        external
        override
        nonReentrant
    {
        require(ACS.layout().roles[APPLY_ROLE][msg.sender], "Missing role");
        require(!PS.layout().paused, "Pausable: paused");
        if (manifest.frozen) revert FrozenContract();
        if (manifest.pendingRoot == bytes32(0)) revert NoPendingRoot();
        uint256 n = selectors.length;
        if (n == 0) return;
        if (n != facetAddrs.length || n != codehashes.length || n != proofs.length || n != isRight.length)
            revert LenMismatch();
        if (n > MAX_BATCH) revert BatchTooLarge(n);

        // de-dupe batch
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i + 1; j < n; j++) {
                if (selectors[i] == selectors[j]) revert DuplicateSelector(selectors[i]);
            }
        }

        bytes32 root = manifest.pendingRoot;
        for (uint256 i = 0; i < n; i++) {
            address facet = facetAddrs[i];
            if (facet == address(0)) revert ZeroAddress();
            if (facet == address(this)) revert FacetIsSelf();
            uint256 sz = facet.code.length;
            if (sz == 0) revert ZeroCodeFacet(facet);
            if (sz > MAX_FACET_CODE) revert CodeSizeExceeded(facet, sz);

            // verify leaf against committed root (ordered Merkle)
            bytes32 leaf = OrderedMerkle.leafOfSelectorRoute(selectors[i], facet, codehashes[i]);
            bool ok = OrderedMerkle.verify(proofs[i], isRight[i], root, leaf);
            if (!ok) revert InvalidProof();

            _setRoute(selectors[i], facet, codehashes[i]);
        }

        uint64 oldVer = manifest.manifestVersion;
        manifest.manifestVersion = oldVer + 1;
        emit ManifestVersionUpdated(oldVer, manifest.manifestVersion);
    }

    /// @notice Activate the committed root after the delay.
    /// @dev L2 WARNING: block.timestamp is sequencer-provided and may have bounded drift vs L1 wall time
    function activateCommittedRoot()
        external
        override
    {
        require(ACS.layout().roles[APPLY_ROLE][msg.sender], "Missing role");
        require(!PS.layout().paused, "Pausable: paused");
        if (manifest.frozen) revert FrozenContract();
        bytes32 pending = manifest.pendingRoot;
        if (pending == bytes32(0)) revert NoPendingRoot();

        uint64 earliest = manifest.committedAt + manifest.activationDelay;
        uint64 nowTs = uint64(block.timestamp);
        if (nowTs < earliest) revert ActivationNotReady(earliest, nowTs);

        // Emit L2 timing warning for governance monitoring
        emit L2TimestampWarning(nowTs, manifest.activationDelay);

        manifest.activeRoot = pending;
        manifest.activeEpoch += 1;
        manifest.pendingRoot = bytes32(0);
        manifest.committedAt = 0;

        uint64 oldVer = manifest.manifestVersion;
        manifest.manifestVersion = oldVer + 1;

        emit RootActivated(manifest.activeRoot, manifest.activeEpoch);
        emit ManifestVersionUpdated(oldVer, manifest.manifestVersion);
    }

    /// @notice Emergency removal of routes (audit-visible, does not change active root).
    function removeRoutes(bytes4[] calldata selectors)
        external
        override
    {
        require(ACS.layout().roles[EMERGENCY_ROLE][msg.sender], "Missing role");
        // SECURITY FIX: Allow emergency route removal even when paused for incident response
        uint256 n = selectors.length;
        if (n > MAX_BATCH) revert BatchTooLarge(n);
        bool changed;
        for (uint256 i = 0; i < n; i++) {
            bytes4 sel = selectors[i];
            address oldFacet = _routes[sel].facet;
            if (oldFacet != address(0)) {
                delete _routes[sel];
                if (registeredSelectors[sel]) {
                    registeredSelectors[sel] = false;
                    if (routeCount > 0) routeCount--;
                }
                _removeSelectorFromFacet(oldFacet, sel);
                emit RouteRemoved(sel);
                changed = true;
            }
        }
        emit RoutesRemoved(selectors);
        // bump manifest version for off-chain observers if any route changed
        if (changed) {
            uint64 oldVer = manifest.manifestVersion;
            manifest.manifestVersion = oldVer + 1;
            emit ManifestVersionUpdated(oldVer, manifest.manifestVersion);
        }
    }

    /// @notice Update activation delay (admin).
    function setActivationDelay(uint64 newDelay)
        external
        override
    {
        require(ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][msg.sender], "Missing role");
        if (manifest.frozen) revert FrozenContract();
        if (newDelay > MAX_ACTIVATION_DELAY) revert ActivationDelayOutOfRange(newDelay);
        uint64 old = manifest.activationDelay;
        manifest.activationDelay = newDelay;
        emit ActivationDelaySet(old, newDelay);
    }

    /// @notice One-way freeze of governance mutators.
    function freeze()
        external
        override
    {
        require(ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][msg.sender], "Missing role");
        if (manifest.frozen) revert FrozenContract();
        manifest.frozen = true;
        emit Frozen();
    }

    /// @notice Enable/disable dev registrar for production safety
    /// @param enabled Whether to allow adminRegisterUnsafe calls
    function setDevRegistrarEnabled(bool enabled)
        external
    {
        require(ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][msg.sender], "Missing role");
        if (manifest.frozen) revert FrozenContract();
        devRegistrarEnabled = enabled;
        emit DevRegistrarToggled(enabled);
    }

    // Pause/unpause provided by PauseFacet to avoid selector duplication

    // ───────────────────────────────────────────────────────────────────────────
    // EIP-2535 Loupe (standard)
    // ───────────────────────────────────────────────────────────────────────────
    function facetAddresses() external view override(IDiamondLoupe) returns (address[] memory) {
        return _facetAddresses;
    }

    function facetFunctionSelectors(address facet) external view override(IDiamondLoupe) returns (bytes4[] memory) {
        return facetSelectors[facet];
    }

    function facetAddress(bytes4 selector) external view override(IDiamondLoupe) returns (address) {
        return _routes[selector].facet;
    }

    function facets() external view override(IDiamondLoupe) returns (IDiamondLoupe.Facet[] memory out) {
        uint256 n = _facetAddresses.length;
        out = new IDiamondLoupe.Facet[](n);
        for (uint256 i = 0; i < n; i++) {
            address fa = _facetAddresses[i];
            out[i] = IDiamondLoupe.Facet({ facetAddress: fa, functionSelectors: facetSelectors[fa] });
        }
    }

    // ERC165 is provided by the canonical ERC165Facet; do not implement here to avoid selector collisions.

    // ───────────────────────────────────────────────────────────────────────────
    // Enhanced Loupe (Ex)
    // ───────────────────────────────────────────────────────────────────────────
    function facetAddressesEx(bool includeUnsafe)
        external
        view
        override(IDiamondLoupeEx)
        returns (address[] memory facetAddresses_)
    {
        uint256 n = _facetAddresses.length;
        if (includeUnsafe) {
            facetAddresses_ = new address[](n);
            for (uint256 i = 0; i < n; i++) {
                facetAddresses_[i] = _facetAddresses[i];
            }
        } else {
            uint256 count;
            for (uint256 i = 0; i < n; i++) {
                if (_facetSecurityLevel[_facetAddresses[i]] > 0) count++;
            }
            facetAddresses_ = new address[](count);
            uint256 idx;
            for (uint256 i = 0; i < n; i++) {
                address fa = _facetAddresses[i];
                if (_facetSecurityLevel[fa] > 0) {
                    facetAddresses_[idx++] = fa;
                }
            }
        }
    }

    function facetFunctionSelectorsEx(address facet, uint8 minSecurityLevel)
        external
        view
        override(IDiamondLoupeEx)
        returns (bytes4[] memory selectors_)
    {
        if (_facetSecurityLevel[facet] < minSecurityLevel) {
            return new bytes4[](0);
        }
        selectors_ = facetSelectors[facet];
    }

    function facetsEx(bool /*includeMetadata*/)
        external
        view
        override(IDiamondLoupeEx)
        returns (IDiamondLoupeEx.FacetEx[] memory facets_)
    {
        uint256 n = _facetAddresses.length;
        facets_ = new IDiamondLoupeEx.FacetEx[](n);
        for (uint256 i = 0; i < n; i++) {
            address fa = _facetAddresses[i];
            facets_[i] = IDiamondLoupeEx.FacetEx({
                facetAddress:      fa,
                functionSelectors: facetSelectors[fa],
                versionTag:        _facetVersionTag[fa],
                securityLevel:     _facetSecurityLevel[fa]
            });
        }
    }

    function facetAddressEx(bytes4 functionSelector, bytes32 requiredVersion)
        external
        view
        override(IDiamondLoupeEx)
        returns (address facetAddress_)
    {
        address fa = _routes[functionSelector].facet;
        if (fa == address(0)) return address(0);
        if (requiredVersion == bytes32(0) || _facetVersionTag[fa] == requiredVersion) {
            return fa;
        }
        return address(0);
    }

    function facetAddressesBatchEx(bytes4[] calldata functionSelectors)
        external
        view
        override(IDiamondLoupeEx)
        returns (address[] memory facetAddresses_)
    {
        uint256 n = functionSelectors.length;
        facetAddresses_ = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            facetAddresses_[i] = _routes[functionSelectors[i]].facet;
        }
    }

    function facetMetadata(address /*facet*/)
        external
        pure
        override(IDiamondLoupeEx)
        returns (IDiamondLoupeEx.FacetMetadata memory metadata_)
    {
        metadata_.name          = "";
        metadata_.category      = "";
        metadata_.dependencies  = new string[](0);
        metadata_.isUpgradeable = true;
    }

    function checkStorageConflicts(address /*facet*/)
        external
        pure
        override(IDiamondLoupeEx)
        returns (bytes32[] memory conflicts_)
    {
        conflicts_ = new bytes32[](0);
    }

    function facetImplementation(address /*facet*/)
        external
        pure
        override(IDiamondLoupeEx)
        returns (address implementation_)
    {
        implementation_ = address(0);
    }

    function facetHash(address facet)
        external
        view
        override(IDiamondLoupeEx)
        returns (bytes32)
    {
        return facet.codehash;
    }

    function selectorHash(address facet)
        external
        view
        override(IDiamondLoupeEx)
        returns (bytes32)
    {
        return _selectorHash(facet);
    }

    function facetProvenance(address facet)
        external
        view
        override(IDiamondLoupeEx)
        returns (address deployer, uint256 deployTimestamp)
    {
        deployer        = _facetDeployer[facet];
        deployTimestamp = _facetDeployedAt[facet];
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Preflight helpers (upgrade-time checks via RefactorSafetyLib)
    // ───────────────────────────────────────────────────────────────────────────
    /**
     * @notice Validate a facet upgrade off-chain before applying routes.
     * @param facet Address of the facet being (re)registered
     * @param expectedCodeHash Expected EXTCODEHASH (bytes32(0) to skip)
     * @param claimedSelectors The full selector set the facet is expected to expose after the upgrade
     * @param allowAdditions Whether new selectors are allowed compared to existing set
     * @return ok True if codehash is OK; selector compatibility reverts on failure
     * @return selectorHashEx Current selector hash fingerprint for the facet (for auditing)
     */
    function preflightCheckFacet(
        address facet,
        bytes32 expectedCodeHash,
        bytes4[] calldata claimedSelectors,
        bool allowAdditions
    ) external view returns (bool ok, bytes32 selectorHashEx) {
        // 1) Codehash preflight (shallow)
        ok = RefactorSafetyLib.performRefactorSafetyCheck(facet, expectedCodeHash, 0);

        // 2) Selector compatibility against current registry (if facet already present)
        bytes4[] storage cur = facetSelectors[facet];
        bytes4[] memory oldS = new bytes4[](cur.length);
        for (uint256 i = 0; i < cur.length; i++) {
            oldS[i] = cur[i];
        }
        bytes4[] memory newS = new bytes4[](claimedSelectors.length);
        for (uint256 j = 0; j < claimedSelectors.length; j++) {
            newS[j] = claimedSelectors[j];
        }
        // Will revert with explicit error if incompatible
        // RefactorSafetyLib.validateSelectorCompatibility(oldS, newS, allowAdditions);
        RefactorSafetyLib.validateSelectorCompatibilityView(oldS, newS, allowAdditions);

        // 3) Return current selector fingerprint for provenance
        selectorHashEx = _selectorHash(facet);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ───────────────────────────────────────────────────────────────────────────
    function _setRoute(bytes4 selector, address facet, bytes32 codehash) internal {
        // runtime integrity check
        if (facet.codehash != codehash) revert FacetCodeMismatch(facet, codehash, facet.codehash);

        address oldFacet = _routes[selector].facet;
        _routes[selector] = IManifestDispatcher.Route(facet, codehash);

        // registry book-keeping
        if (!registeredSelectors[selector]) {
            registeredSelectors[selector] = true;
            routeCount++;
            _addSelectorToFacet(facet, selector);
            emit RouteAdded(selector, facet, codehash);
        } else if (oldFacet != facet) {
            _removeSelectorFromFacet(oldFacet, selector);
            _addSelectorToFacet(facet, selector);
            emit RouteUpdated(selector, oldFacet, facet);
        }

        // provenance / defaults for Enhanced Loupe
        if (_facetDeployer[facet] == address(0)) {
            _facetDeployer[facet]  = msg.sender;
            _facetDeployedAt[facet] = uint64(block.timestamp);
        }
        if (_facetSecurityLevel[facet] == 0) {
            _facetSecurityLevel[facet] = 1; // default "user" level
        }
        // _facetVersionTag[facet] remains bytes32(0) unless set via governance (out of scope here)
    }

    function _addSelectorToFacet(address facet, bytes4 selector) internal {
        bytes4[] storage sels = facetSelectors[facet];
        for (uint256 i = 0; i < sels.length; i++) {
            if (sels[i] == selector) return;
        }
        if (sels.length == 0) {
            // first time we see this facet
            _facetAddresses.push(facet);
        }
        sels.push(selector);
    }

    function _removeSelectorFromFacet(address facet, bytes4 selector) internal {
        bytes4[] storage sels = facetSelectors[facet];
        for (uint256 i = 0; i < sels.length; i++) {
            if (sels[i] == selector) {
                sels[i] = sels[sels.length - 1];
                sels.pop();
                break;
            }
        }
        // drop facet if empty
        if (sels.length == 0) {
            uint256 n = _facetAddresses.length;
            for (uint256 i = 0; i < n; i++) {
                if (_facetAddresses[i] == facet) {
                    _facetAddresses[i] = _facetAddresses[n - 1];
                    _facetAddresses.pop();
                    break;
                }
            }
        }
    }

    function _selectorHash(address facet) internal view returns (bytes32) {
        // Copy selectors and sort in-memory for a deterministic hash
        bytes4[] memory sels = facetSelectors[facet];
        uint256 n = sels.length;
        // insertion sort (small n typical)
        for (uint256 i = 1; i < n; i++) {
            bytes4 key = sels[i];
            uint256 j = i;
            while (j > 0 && uint32(sels[j - 1]) > uint32(key)) {
                sels[j] = sels[j - 1];
                unchecked { --j; }
            }
            sels[j] = key;
        }
        return keccak256(abi.encodePacked(facet.codehash, sels));
    }

    /// @notice DEV-ONLY: Directly register routes without Merkle proofs.
    /// @dev Intended for local/test networks to enable fast demos and CI smoke tests.
    ///      Enforced via APPLY_ROLE and whenNotPaused; also rejects self/zero/oversized facets.
    /// @param facets_    List of facet addresses
    /// @param selectors_ Parallel list of selector arrays corresponding to each facet
    function adminRegisterUnsafe(address[] calldata facets_, bytes4[][] calldata selectors_)
        external
    {
        require(ACS.layout().roles[APPLY_ROLE][msg.sender], "Missing role");
        require(!PS.layout().paused, "Pausable: paused");
        if (manifest.frozen) revert FrozenContract(); // SECURITY FIX: prevent freeze bypass
        if (!devRegistrarEnabled) revert DevOnly(); // SECURITY FIX: production safety gate
        uint256 n = facets_.length;
        if (n == 0) return;
        if (n != selectors_.length) revert LenMismatch();
        if (n > MAX_BATCH) revert BatchTooLarge(n);

        for (uint256 i = 0; i < n; i++) {
            address facet = facets_[i];
            if (facet == address(0)) revert ZeroAddress();
            if (facet == address(this)) revert FacetIsSelf();
            uint256 sz = facet.code.length;
            if (sz == 0) revert ZeroCodeFacet(facet);
            if (sz > MAX_FACET_CODE) revert CodeSizeExceeded(facet, sz);
            bytes32 ch = facet.codehash;

            bytes4[] calldata sels = selectors_[i];
            uint256 m = sels.length;
            if (m > MAX_BATCH) revert BatchTooLarge(m);
            for (uint256 j = 0; j < m; j++) {
                _setRoute(sels[j], facet, ch);
            }
        }

        uint64 oldVer = manifest.manifestVersion;
        manifest.manifestVersion = oldVer + 1;
        emit ManifestVersionUpdated(oldVer, manifest.manifestVersion);
    }

    /// @notice Apply a single route update (low-level, bypassing Merkle proof).
    function applyRouteOne(
        bytes4 selector,
        address facetAddr,
        bytes32 codehash,
        bytes32[] calldata proof,
        bool[] calldata isRight_
    ) external {
        require(ACS.layout().roles[APPLY_ROLE][msg.sender], "Missing role");
        require(!PS.layout().paused, "Pausable: paused");
        bytes4[] memory selectors = new bytes4[](1);
        address[] memory facets_ = new address[](1);
        bytes32[] memory codehashes = new bytes32[](1);
        bytes32[][] memory proofs = new bytes32[][](1);
        bool[][] memory isRight = new bool[][](1);
        selectors[0] = selector;
        facets_[0] = facetAddr;
        codehashes[0] = codehash;
        proofs[0] = proof;
        isRight[0] = isRight_;
        this.applyRoutes(selectors, facets_, codehashes, proofs, isRight);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Governance helpers for facet metadata
    // ───────────────────────────────────────────────────────────────────────────
    function setFacetSecurityLevel(address facet, uint8 level)
        external
    {
        require(ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][msg.sender], "Missing role");
        if (manifest.frozen) revert FrozenContract();
        // Require known facet (provenance set on first registration)
        if (_facetDeployer[facet] == address(0)) revert FacetUnknown(facet);
        // Allow 0 = hidden/unsafe; bound upper levels to a small range for consistency
        if (level > 3) revert InvalidSecurityLevel(level);
        _facetSecurityLevel[facet] = level;
        emit FacetSecurityLevelSet(facet, level);
    }

    function setFacetVersionTag(address facet, bytes32 tag)
        external
    {
        require(ACS.layout().roles[ACS.DEFAULT_ADMIN_ROLE][msg.sender], "Missing role");
        if (manifest.frozen) revert FrozenContract();
        if (_facetDeployer[facet] == address(0)) revert FacetUnknown(facet);
        _facetVersionTag[facet] = tag;
        emit FacetVersionTagSet(facet, tag);
    }
}
