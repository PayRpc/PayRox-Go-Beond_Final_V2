'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const hardhat_1 = __importDefault(require('hardhat'));
const merkle_1 = require('../utils/merkle');
const ordered_merkle_1 = require('../utils/ordered-merkle');
async function main() {
  console.log('Starting semi-real merkle simulation...');
  const artifacts = hardhat_1.default.artifacts;
  // Small synthetic manifest using existing compiled contracts (choose a couple of facets present in repo)
  const manifest = {
    facets: [
      { name: 'ExampleA', contract: 'ExampleFacetA' },
      { name: 'ExampleB', contract: 'ExampleFacetB' },
    ],
    deployment: {},
  };
  // Use a deterministic factory address for simulation
  const factoryAddress = '0x00000000000000000000000000000000deadbeef';
  // Collect library names required by artifacts so we can provide dummy addresses for linking in simulation
  const libraryAddresses = {};
  for (const f of manifest.facets) {
    try {
      const art = await artifacts.readArtifact(f.contract);
      const refs = art.deployedLinkReferences || art.linkReferences || {};
      for (const file of Object.keys(refs)) {
        const libs = refs[file] || {};
        for (const libName of Object.keys(libs)) {
          // Provide a deterministic dummy address per library (last 20 hex chars from keccak)
          if (!libraryAddresses[libName]) {
            const ethers = hardhat_1.default.ethers;
            const dummy = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(libName)).slice(-40);
            libraryAddresses[libName] = '0x' + dummy;
          }
        }
      }
    } catch (_e) {
      // ignore artifact read errors here
    }
  }
  const { root, proofs, positions, leaves, leafMeta } = await (0, merkle_1.generateManifestLeaves)(
    manifest,
    artifacts,
    factoryAddress,
    { libraryAddresses },
  );
  console.log('Computed root:', root);
  console.log('Leaves count:', leaves.length);
  // Verify each proof with ordered-merkle helpers
  for (let i = 0; i < leaves.length; i++) {
    const meta = leafMeta[i];
    const key = `${meta.selector}:${meta.facet}:${meta.codehash}`;
    const proof = proofs[key] || [];
    const pos = positions[key] || '0x0';
    let ok = false;
    try {
      ok = (0, ordered_merkle_1.verifyOrderedProof)(leaves[i], proof, pos, root);
    } catch (_e) {
      ok = false;
    }
    console.log(`leaf ${i} (${meta.selector}) proof length ${proof.length} => verified: ${ok}`);
  }
  console.log('Simulation complete.');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
