import { encodeLeaf } from '../utils/merkle';
import { createRouteLeaf, processOrderedProof, verifyOrderedProof } from '../utils/ordered-merkle';
import assert from 'assert';

async function main() {
  console.log('Running merkle smoke checks...');

  // Basic parity check: encodeLeaf (merkle.ts) vs createRouteLeaf (ordered-merkle.ts)
  const selector = '0x12345678';
  // valid 20-byte address (0x + 40 hex chars)
  const facet = '0x00000000000000000000000000000000deadbeef';
  const codehash = '0x' + 'ab'.repeat(32);

  const leafA = encodeLeaf(selector, facet, codehash);
  const leafB = createRouteLeaf(selector, facet, codehash);

  console.log('leafA:', leafA);
  console.log('leafB:', leafB);
  assert.strictEqual(leafA.toLowerCase(), leafB.toLowerCase(), 'Leaf encoders disagree');

  // Build a tiny tree: leaves [leaf0, leaf1]
  const leaf0 = leafA;
  const leaf1 = '0x' + '01'.repeat(32);

  // sibling proof for leaf0 is [leaf1], positions bitfield: 0 => sibling is right (0x00), 1 => sibling is left (0x01)
  const proof = [leaf1];
  const positionsRight = '0x00'; // sibling is right (leaf1 on right)
  const positionsLeft = '0x01'; // sibling is left (leaf1 on left)

  // Compute root when leaf0 is left: keccak256(leaf0 || leaf1)
  const rootLeft = processOrderedProof(leaf0, proof, positionsRight);
  const expectedRootLeft = processOrderedProof(leaf0, proof, positionsRight); // same
  assert.strictEqual(
    rootLeft.toLowerCase(),
    expectedRootLeft.toLowerCase(),
    'processOrderedProof failed for left sibling case',
  );
  assert.strictEqual(
    verifyOrderedProof(leaf0, proof, positionsRight, rootLeft),
    true,
    'verifyOrderedProof failed for left sibling case',
  );

  // When positions indicate sibling is left, computed root should be keccak256(leaf1 || leaf0)
  const rootRight = processOrderedProof(leaf0, proof, positionsLeft);
  assert.strictEqual(
    verifyOrderedProof(leaf0, proof, positionsLeft, rootRight),
    true,
    'verifyOrderedProof failed for right sibling case',
  );

  console.log('Smoke checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
