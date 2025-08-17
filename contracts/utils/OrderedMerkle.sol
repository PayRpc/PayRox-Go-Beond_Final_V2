// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title OrderedMerkle
 * @notice Position-aware Merkle proof verification with advanced features
 * @dev Features:
 * - Selector-based route proofs with enhanced security
 * - Defensive proof length bounds
 * - Gas-aware dynamic limits
 * - Stateless design for library compatibility
 */
library OrderedMerkle {
    /*//////////////////////////////////////////////////////////////
                               ERRORS & CONSTANTS
    //////////////////////////////////////////////////////////////*/

    error ProofLengthMismatch(uint256 proofLength, uint256 positionLength);
    error ProofTooLong(uint256 length, uint256 maxLength);
    error InsufficientGas(uint256 required, uint256 available);

    uint256 private constant MAX_PROOF_LENGTH = 256;
    uint256 private constant STEP_GAS = 10_000;
    uint256 private constant SAFETY_BUFFER = 30_000;

    /*//////////////////////////////////////////////////////////////
                          PROOF VERIFICATION
    //////////////////////////////////////////////////////////////*/

    function processProof(
        bytes32 leaf,
        bytes32[] calldata proof,
        uint256 positions
    ) internal pure returns (bytes32 computed) {
        uint256 n = proof.length;

        // Defensive bounds check
        if (n > MAX_PROOF_LENGTH) {
            revert ProofTooLong(n, MAX_PROOF_LENGTH);
        }

        // Mask unused bits
        if (n < 256) positions &= (1 << n) - 1;

        computed = _hashLeaf(leaf);

        unchecked {
            for (uint256 i; i < n; ++i) {
                bool isRight = (positions >> i) & 1 == 1;
                computed = isRight
                    ? _hashNode(computed, proof[i])
                    : _hashNode(proof[i], computed);
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                          ROUTE VERIFICATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Creates deterministic leaf for selector-based routing
     * @param selector Function selector
     * @param facet Implementation address
     * @param codehash Codehash for additional safety
     */
    function leafOfSelectorRoute(
        bytes4 selector,
        address facet,
        bytes32 codehash
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            bytes1(0x00),
            selector,
            facet,
            codehash
        ));
    }

    /**
     * @notice Verify route proof
     */
    function verifyRoute(
        bytes4 selector,
        address facet,
        bytes32 codehash,
        bytes32[] calldata proof,
        uint256 positions,
        bytes32 root
    ) internal pure returns (bool) {
        bytes32 leaf = leafOfSelectorRoute(selector, facet, codehash);
        return verify(leaf, proof, positions, root);
    }

    /*//////////////////////////////////////////////////////////////
                          MAIN VERIFICATION API
    //////////////////////////////////////////////////////////////*/

    function verify(
        bytes32 leaf,
        bytes32[] calldata proof,
        uint256 positions,
        bytes32 root
    ) internal pure returns (bool) {
        return processProof(leaf, proof, positions) == root;
    }

    /*//////////////////////////////////////////////////////////////
                          LEGACY COMPATIBILITY
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Legacy verify function with boolean array (for backward compatibility)
     * @dev Converts boolean array to bitfield internally
     */
    function verify(
        bytes32[] memory proof,
        bool[] memory isRight,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        if (proof.length != isRight.length) {
            revert ProofLengthMismatch(proof.length, isRight.length);
        }

        uint256 n = proof.length;

        // Defensive bounds check
        if (n > MAX_PROOF_LENGTH) {
            revert ProofTooLong(n, MAX_PROOF_LENGTH);
        }

        // Convert boolean array to bitfield
        uint256 positions = 0;
        for (uint256 i = 0; i < n; i++) {
            if (isRight[i]) {
                positions |= (1 << i);
            }
        }

        // Mask unused bits
        if (n < 256) positions &= (1 << n) - 1;

        bytes32 computed = _hashLeaf(leaf);

        unchecked {
            for (uint256 i; i < n; ++i) {
                bool isRightBit = (positions >> i) & 1 == 1;
                computed = isRightBit
                    ? _hashNode(computed, proof[i])
                    : _hashNode(proof[i], computed);
            }
        }

        return computed == root;
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/

    function _hashLeaf(bytes32 leaf) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(bytes1(0x00), leaf));
    }

    function _hashNode(bytes32 left, bytes32 right) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(bytes1(0x01), left, right));
    }
}
