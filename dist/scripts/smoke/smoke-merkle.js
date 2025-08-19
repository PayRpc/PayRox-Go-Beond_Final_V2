'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const merkle_1 = require('../utils/merkle');
const ordered_merkle_1 = require('../utils/ordered-merkle');
const assert_1 = __importDefault(require('assert'));
async function main() {
  console.log('Running merkle smoke checks...');
  // Basic parity check: encodeLeaf (merkle.ts) vs createRouteLeaf (ordered-merkle.ts)
  const selector = '0x12345678';
  // valid 20-byte address (0x + 40 hex chars)
  const facet = '0x00000000000000000000000000000000deadbeef';
  const codehash = '0x' + 'ab'.repeat(32);
  const leafA = (0, merkle_1.encodeLeaf)(selector, facet, codehash);
  const leafB = (0, ordered_merkle_1.createRouteLeaf)(selector, facet, codehash);
  console.log('leafA:', leafA);
  console.log('leafB:', leafB);
  assert_1.default.strictEqual(leafA.toLowerCase(), leafB.toLowerCase(), 'Leaf encoders disagree');
  // Build a tiny tree: leaves [leaf0, leaf1]
  const leaf0 = leafA;
  const leaf1 = '0x' + '01'.repeat(32);
  // sibling proof for leaf0 is [leaf1], positions bitfield: 0 => sibling is right (0x00), 1 => sibling is left (0x01)
  const proof = [leaf1];
  const positionsRight = '0x00'; // sibling is right (leaf1 on right)
  const positionsLeft = '0x01'; // sibling is left (leaf1 on left)
  // Compute root when leaf0 is left: keccak256(leaf0 || leaf1)
  const rootLeft = (0, ordered_merkle_1.processOrderedProof)(leaf0, proof, positionsRight);
  const expectedRootLeft = (0, ordered_merkle_1.processOrderedProof)(leaf0, proof, positionsRight); // same
  assert_1.default.strictEqual(
    rootLeft.toLowerCase(),
    expectedRootLeft.toLowerCase(),
    'processOrderedProof failed for left sibling case',
  );
  assert_1.default.strictEqual(
    (0, ordered_merkle_1.verifyOrderedProof)(leaf0, proof, positionsRight, rootLeft),
    true,
    'verifyOrderedProof failed for left sibling case',
  );
  // When positions indicate sibling is left, computed root should be keccak256(leaf1 || leaf0)
  const rootRight = (0, ordered_merkle_1.processOrderedProof)(leaf0, proof, positionsLeft);
  assert_1.default.strictEqual(
    (0, ordered_merkle_1.verifyOrderedProof)(leaf0, proof, positionsLeft, rootRight),
    true,
    'verifyOrderedProof failed for right sibling case',
  );
  console.log('Smoke checks passed.');
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
