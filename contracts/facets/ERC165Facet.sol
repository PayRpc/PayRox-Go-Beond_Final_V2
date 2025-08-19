// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {PayRoxERC165Storage} from "../libraries/PayRoxERC165Storage.sol";

/**
 * @title ERC165Facet
 * @notice Single source of truth for supportsInterface(bytes4).
 *         Do NOT duplicate supportsInterface in other facets.
 */
contract ERC165Facet {
    /// @notice EIP-165 ID for ERC165 itself.
    bytes4 internal constant _INTERFACE_ID_ERC165 = 0x01ffc9a7;

    function supportsInterface(bytes4 interfaceId) external view returns (bool) {
        if (interfaceId == _INTERFACE_ID_ERC165) return true;
        return PayRoxERC165Storage.layout().supported[interfaceId];
    }
}

/// @dev Minimal IERC165 for NatSpec only (not required, included for clarity)
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
