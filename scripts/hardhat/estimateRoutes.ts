import hre from 'hardhat';
import { encodeLeaf } from '../utils/merkle';

async function main() {
  const ethers = (hre as any).ethers;
  console.log('Compiling and deploying minimal fixtures for gas estimation...');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const DispatcherFactory = await ethers.getContractFactory('ManifestDispatcher');

  // Pass constructor args: admin address and activationDelaySeconds (e.g., 3600 seconds)
  const admin = deployer.address;
  const activationDelaySeconds = 3600; // 1 hour for gas-estimate fixture
  const dispatcher = await DispatcherFactory.deploy(admin, activationDelaySeconds);
  await dispatcher.waitForDeployment();
  console.log('Dispatcher deployed at', await dispatcher.getAddress());

  const selectors = ['0x00000000']; // single bytes4 selector
  // Deploy a minimal facet (ExampleFacetA) so the facet has code and a stable codehash
  let facet: { address: string };
  try {
    // If ExampleFacetA depends on libraries, deploy them first and link
    let gasLibAddress: string | null = null;
    try {
      const GasFactory = await ethers.getContractFactory('GasOptimizationUtils');
      const gasLib = await GasFactory.deploy();
      await gasLib.waitForDeployment();
      gasLibAddress = await gasLib.getAddress();
      console.log('Deployed GasOptimizationUtils at', gasLibAddress);
    } catch (linkErr) {
      console.warn(
        'GasOptimizationUtils deploy/link skipped:',
        (linkErr as any)?.message || linkErr,
      );
    }

    let FacetFactory;
    if (gasLibAddress) {
      const libraries = {
        'contracts/utils/GasOptimizationUtils.sol:GasOptimizationUtils': gasLibAddress,
      };
      FacetFactory = await ethers.getContractFactory('ExampleFacetA', { libraries });
    } else {
      FacetFactory = await ethers.getContractFactory('ExampleFacetA');
    }

    const facetCtr = await FacetFactory.deploy();
    await facetCtr.waitForDeployment();
    facet = { address: await facetCtr.getAddress() };
    console.log('Deployed ExampleFacetA at', facet.address);
  } catch (err) {
    console.warn(
      'ExampleFacetA not found or failed to deploy, falling back to deployer as facet (may revert)',
      (err as any)?.message || err,
    );
    facet = { address: deployer.address };
  }

  const facets = [facet.address];
  // compute on-chain code hash for the deployed facet
  let codehash = ethers.ZeroHash;
  try {
    const code = await ethers.provider.getCode(facet.address);
    codehash = ethers.keccak256(code);
  } catch (err) {
    console.warn('Failed to fetch code for facet:', (err as any)?.message || err);
  }
  const codehashes = [codehash];

  // proofs is an array of bytes32[]; for a single-leaf tree the proof can be an empty array
  const proofs: string[][] = [[]];
  // isRight is a bool[][] matching proofs; provide a single empty inner array
  const isRight: boolean[][] = [[]];

  // Compute the leaf using the shared helper (matches OrderedMerkle.leafOfSelectorRoute)
  const leaf = encodeLeaf(selectors[0], facets[0], codehashes[0]);

  // Commit the root to make applyRoutes callable (commitRoot requires COMMIT_ROLE which deployer has)
  try {
    const root = ethers.keccak256(ethers.concat(['0x00', leaf]));
    const commitTx = await (await dispatcher.commitRoot(root, 1)).wait();
    console.log('Committed root', root, 'tx:', commitTx.transactionHash);
  } catch (err) {
    console.error('commitRoot failed:', (err && (err as Error).message) || err);
  }

  try {
    const gas = await dispatcher.estimateGas.applyRoutes(
      selectors,
      facets,
      codehashes,
      proofs,
      isRight,
    );
    console.log(`estimateGas applyRoutes => ${gas.toString()}`);
  } catch (err) {
    console.error('estimateGas failed:', (err && (err as Error).message) || err);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
