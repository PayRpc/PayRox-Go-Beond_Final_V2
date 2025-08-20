import { encodeLeaf } from '../scripts/utils/merkle';
import { processOrderedProof } from '../scripts/utils/ordered-merkle';
import { expect } from 'chai';
import { ethers } from 'hardhat';

// Minimal synthetic roundtrip: build a tiny ordered tree of 2 leaves and verify root matches.

describe('Ordered Merkle (2-leaf) roundtrip', () => {
  it('computes identical root via processOrderedProof', () => {
    // Two synthetic leaves (selector bytes4, facet address, codehash bytes32)
    const selA = '0xaaaaaaaa';
    const selB = '0xbbbbbbbb';
    const facet = '0x0000000000000000000000000000000000000001';
    const codehash = '0x' + '11'.repeat(32);

    const leafHashA = encodeLeaf(selA, facet, codehash);
    const leafHashB = encodeLeaf(selB, facet, codehash);

    // _hashLeaf = keccak256(0x00 || leaf)
    const { keccak256, concat } = ethers;
    const leafNodeA = keccak256(concat(['0x00', leafHashA]));
    const leafNodeB = keccak256(concat(['0x00', leafHashB]));

    // _hashNode(left,right) = keccak256(0x01||left||right)
    const root = keccak256(concat(['0x01', leafNodeA, leafNodeB]));

    // Proof for left leaf: sibling is right child => positions bit 0 = 1
    const proof = [leafNodeB];
    const positionsHex = '0x01';

    const recomputed = processOrderedProof(leafHashA, proof, positionsHex);
    expect(recomputed.toLowerCase()).to.equal(root.toLowerCase());
  });
});
