// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {PayRoxERC165Storage} from "../libraries/PayRoxERC165Storage.sol";

/* ---------- Minimal interfaces ONLY to compute interfaceId constants ---------- */
/* Return types do NOT affect selectors; these are not intended for calling.    */

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC173 {
    function owner() external view returns (address);
    function transferOwnership(address newOwner) external;
}

interface IDiamondLoupe {
    function facets() external view returns (bytes memory);
    function facetFunctionSelectors(address facet) external view returns (bytes4[] memory);
    function facetAddresses() external view returns (address[] memory);
    function facetAddress(bytes4 selector) external view returns (address);
}

/* Optional examples — only include if you actually expose these */
interface IAccessControl {
    function hasRole(bytes32 role, address account) external view returns (bool);
}
interface IPausable {
    function paused() external view returns (bool);
}

/**
 * @title PayRoxDiamondInit
 * @notice Called via diamondCut(..., _init, _calldata) to register interface IDs.
 *         Keep this as the only place you "turn on" interface IDs.
 */
import {PayRoxAccessControlStorage as ACS} from "../libraries/PayRoxAccessControlStorage.sol";
import {PayRoxPauseStorage as PS} from "../libraries/PayRoxPauseStorage.sol";

contract PayRoxDiamondInit {
    /// @param data abi.encode(address admin, address pauser)
    function init(bytes memory data) external {
        (address admin, address pauser) = abi.decode(data, (address, address));

        // Register ERC165 (redundant but harmless — supportsInterface handles it)
        PayRoxERC165Storage.layout().supported[type(IERC165).interfaceId] = true;

        // Common PayRox / diamond interfaces — enable the ones you actually use.
        PayRoxERC165Storage.layout().supported[type(IDiamondLoupe).interfaceId] = true; // EIP-2535 Loupe
        PayRoxERC165Storage.layout().supported[type(IERC173).interfaceId]      = true; // Ownership (EIP-173)
        PayRoxERC165Storage.layout().supported[type(IAccessControl).interfaceId] = true;
        PayRoxERC165Storage.layout().supported[type(IPausable).interfaceId]      = true;

        // Seed roles: give admin the DEFAULT_ADMIN_ROLE and make pauser a PAUSER_ROLE holder
        ACS.Layout storage a = ACS.layout();
        a.roles[ACS.DEFAULT_ADMIN_ROLE][admin] = true;

        // PAUSER_ROLE constant from PauseFacet: use the same hard-coded value
        bytes32 PAUSER_ROLE = 0xf1d6b5c02d3d7f2e5f7acb9c5c273942a5b9e2f5c22e8c4e3c8a7b8c6d4a1234;
        a.roles[PAUSER_ROLE][pauser] = true;

        // Ensure pause default is false
        PS.layout().paused = false;
    }
}
