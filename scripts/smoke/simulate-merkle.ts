import hre from 'hardhat';
import { generateManifestLeaves } from '../utils/merkle';
import { verifyOrderedProof } from '../utils/ordered-merkle';

async function main() {
  console.log('Starting semi-real merkle simulation...');

  const artifacts = hre.artifacts;

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
  const libraryAddresses: Record<string, string> = {};
  for (const f of manifest.facets) {
    try {
      const art = await artifacts.readArtifact(f.contract);
      const refs = art.deployedLinkReferences || art.linkReferences || {};
      for (const file of Object.keys(refs)) {
        const libs = refs[file] || {};
        for (const libName of Object.keys(libs)) {
          // Provide a deterministic dummy address per library (last 20 hex chars from keccak)
          if (!libraryAddresses[libName]) {
            const ethers = (hre as any).ethers;
            const dummy = ethers.keccak256(ethers.toUtf8Bytes(libName)).slice(-40);
            libraryAddresses[libName] = '0x' + dummy;
          }
        }
      }
    } catch (_e) {
      // ignore artifact read errors here
    }
  }

  const { root, proofs, positions, leaves, leafMeta } = await generateManifestLeaves(
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
      ok = verifyOrderedProof(leaves[i], proof, pos, root);
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
