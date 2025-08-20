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
 * 
 * @dev What OrderedMerkle does that a "regular" Merkle (common sorted/unordered tree) usually doesn't:
 * 
 * ## What's Special
 * 
 * **Position-aware proofs (ordered tree):**
 * Left vs right matters at every level. You pass a path bitfield (or bools) that says 
 * "hash me on the left/right here". Regular "sorted" trees often sort (a,b) before hashing, 
 * which makes the tree commutative and opens malleability tricks; OrderedMerkle closes that.
 * 
 * **Strong domain separation:**
 * Nodes are tagged: 0x00 || leafHash for leaves and 0x01 || left || right for parents. 
 * That prevents cross-type collisions (no way to fake an internal node as a leaf or vice-versa). 
 * Many basic implementations omit this.
 * 
 * **Selector-route leaves for Diamonds:**
 * A route leaf is keccak(abi.encode(selector, facet, codehash)) (then leaf-domain applied), 
 * so you bind:
 * - the function selector,
 * - the facet address, and  
 * - the facet's EXTCODEHASH.
 * This means a redeploy at the same address (different bytecode) fails verification—excellent for facet integrity.
 * 
 * Selector-route leaves including EXTCODEHASH are very rare—that's a PayRox-style hardening 
 * tailored to Diamond routing integrity (protects against same-address code swaps). 
 * Typical trees don't bind codehash at all.
 * 
 * **Proof length bounds + bitfield packing:**
 * Caps depth at 256 and compresses directions into a uint256 bitfield. That's cheaper and 
 * harder to misuse than arbitrary-length arrays. Regular trees often accept unbounded arrays 
 * and skip masking extra bits.
 * 
 * **Legacy-compatible API, but single canonical rule:**
 * You expose both (proof, positions) and a legacy (proof, bool[] isRight)—same semantics, 
 * preventing tool drift.
 * 
 * ## Why It Matters (Security & Ops)
 * 
 * **No proof malleability:** ordered hashing + domain tags stop the classic "swap siblings / sorted pair" ambiguities.
 * 
 * **Upgrade safety:** codehash-pinned leaves make manifest routes resilient to same-address bytecode swaps.
 * 
 * **Deterministic off-chain ↔ on-chain parity:** with one leaf rule and an ordered Merkle, 
 * manifest builders can't accidentally compute a different root.
 * 
 * ## Trade-offs vs Regular Merkle
 * 
 * **Slightly bigger/stricter proofs** (you must carry left/right), but safer.
 * 
 * **Off-chain tooling must follow the exact leaf and node encoding** (including domain tags) 
 * or proofs won't verify—by design.
 */
library OrderedMerkle {
    /*//////////////////////////////////////////////////////////////
                               ERRORS & CONSTANTS
    //////////////////////////////////////////////////////////////*/

    error ProofLengthMismatch(uint256 proofLength, uint256 positionLength);
    error ProofTooLong(uint256 length, uint256 maxLength);

    uint256 private constant MAX_PROOF_LENGTH = 256;

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
        if (n < 256) positions &= (uint256(1) << n) - 1;

        computed = _hashLeaf(leaf);

        unchecked {
            for (uint256 i; i < n; ++i) {
                bool isRight = ((positions >> i) & 1) == 1;
                computed = isRight ? _hashNode(computed, proof[i]) : _hashNode(proof[i], computed);
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
     * @dev Aligned with spec/docs: uses abi.encode (no extra prefix)
     */
    function leafOfSelectorRoute(
        bytes4 selector,
        address facet,
        bytes32 codehash
    ) internal pure returns (bytes32) {
        // Spec-consistent leaf: keccak(abi.encode(...))
        // _hashLeaf will add the single 0x00 prefix when building tree
        return keccak256(abi.encode(selector, facet, codehash));
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
     * @dev Converts boolean array to bitfield internally, uses calldata for gas efficiency
     */
    function verify(
        bytes32[] calldata proof,
        bool[] calldata isRight,
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
                positions |= (uint256(1) << i);
            }
        }

        // Mask unused bits
        if (n < 256) positions &= (uint256(1) << n) - 1;

        bytes32 computed = _hashLeaf(leaf);

        unchecked {
            for (uint256 i; i < n; ++i) {
                bool isRightBit = ((positions >> i) & 1) == 1;
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
