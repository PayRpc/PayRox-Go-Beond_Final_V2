/**
 * Process an ordered Merkle proof using bitfield position encoding (LSB-first)
 * @param leaf The leaf hash (0x-prefixed hex string)
 * @param proof Array of sibling hashes (0x-prefixed hex strings)
 * @param positionsHex Bitfield hex string (e.g., "0x01") where bit i = 1 means sibling i is on the right
 * @returns Computed root hash
 */
export declare function processOrderedProof(
  leaf: string,
  proof: string[],
  positionsHex: string,
): string;
/**
 * Verify an ordered Merkle proof using bitfield position encoding
 * @param leaf The leaf hash (0x-prefixed hex string)
 * @param proof Array of sibling hashes (0x-prefixed hex strings)
 * @param positionsHex Bitfield hex string (e.g., "0x01")
 * @param root Expected root hash (0x-prefixed hex string)
 * @returns True if proof is valid
 */
export declare function verifyOrderedProof(
  leaf: string,
  proof: string[],
  positionsHex: string,
  root: string,
): boolean;
/**
 * Create a leaf hash for manifest route verification
 * @param selector 4-byte function selector (0x-prefixed)
 * @param facet Facet address (0x-prefixed)
 * @param codehash Expected codehash (0x-prefixed)
 * @returns Leaf hash for Merkle tree
 */
export declare function createRouteLeaf(selector: string, facet: string, codehash: string): string;
/**
 * Generate versionBytes32 from version string for canonical manifest hashing
 * @param version Human-readable version string (e.g., "v1.2.3")
 * @returns 32-byte hash of version string
 */
export declare function getVersionBytes32(version: string): string;
