import { ethers } from 'ethers';

/**
 * Process an ordered Merkle proof using bitfield position encoding (LSB-first)
 * @param leaf The leaf hash (0x-prefixed hex string)
 * @param proof Array of sibling hashes (0x-prefixed hex strings)
 * @param positionsHex Bitfield hex string (e.g., "0x01") where bit i = 1 means sibling i is on the right
 * @returns Computed root hash
 */
export function processOrderedProof(leaf: string, proof: string[], positionsHex: string): string {
  let computed = leaf.toLowerCase();
  const positions = BigInt(positionsHex);

  for (let i = 0n; i < BigInt(proof.length); i++) {
    const sib = proof[Number(i)].toLowerCase();
    const isRight = ((positions >> i) & 1n) === 1n;
    computed = isRight
      ? ethers.utils.keccak256(ethers.utils.concat([computed, sib]))
      : ethers.utils.keccak256(ethers.utils.concat([sib, computed]));
  }

  return computed;
}

/**
 * Verify an ordered Merkle proof using bitfield position encoding
 * @param leaf The leaf hash (0x-prefixed hex string)
 * @param proof Array of sibling hashes (0x-prefixed hex strings)
 * @param positionsHex Bitfield hex string (e.g., "0x01")
 * @param root Expected root hash (0x-prefixed hex string)
 * @returns True if proof is valid
 */
export function verifyOrderedProof(
  leaf: string,
  proof: string[],
  positionsHex: string,
  root: string,
): boolean {
  // Schema guardrail: assert no high bits beyond proof length
  const positions = BigInt(positionsHex);
  if (positions >> BigInt(proof.length) !== 0n) {
    throw new Error(
      `Invalid positions bitfield: extra high bits detected beyond proof.length=${proof.length}`,
    );
  }

  return processOrderedProof(leaf, proof, positionsHex).toLowerCase() === root.toLowerCase();
}

/**
 * Create a leaf hash for manifest route verification
 * @param selector 4-byte function selector (0x-prefixed)
 * @param facet Facet address (0x-prefixed)
 * @param codehash Expected codehash (0x-prefixed)
 * @returns Leaf hash for Merkle tree
 */
export function createRouteLeaf(selector: string, facet: string, codehash: string): string {
  // Use proper ABI encoding: bytes4, address, bytes32 (not padded bytes32s)
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes4', 'address', 'bytes32'],
      [selector, facet, codehash],
    ),
  );
}

/**
 * Generate versionBytes32 from version string for canonical manifest hashing
 * @param version Human-readable version string (e.g., "v1.2.3")
 * @returns 32-byte hash of version string
 */
export function getVersionBytes32(version: string): string {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(version));
}
