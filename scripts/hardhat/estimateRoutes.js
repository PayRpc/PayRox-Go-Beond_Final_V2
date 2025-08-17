const hre = require('hardhat');

async function main() {
  const ethers = hre.ethers;
  console.log('Compiling and deploying minimal fixtures for gas estimation...');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  let DispatcherFactory;
  try {
    DispatcherFactory = await ethers.getContractFactory('ManifestDispatcher');
  } catch {
    console.warn(
      'ManifestDispatcher contract not found in artifacts. Ensure compiled artifacts exist.',
    );
    process.exit(0);
  }

  // Pass constructor args: admin address and activationDelaySeconds (e.g., 3600 seconds)
  const admin = deployer.address;
  const activationDelaySeconds = 3600; // 1 hour for gas-estimate fixture
  const dispatcher = await DispatcherFactory.deploy(admin, activationDelaySeconds);
  await dispatcher.deployed();
  console.log('Dispatcher deployed at', dispatcher.address);

  const selectors = ['0x00000000']; // single bytes4 selector
  // Deploy a minimal facet (ExampleFacetA) so the facet has code and a stable codehash
  let facet;
  try {
    // If ExampleFacetA depends on libraries, deploy them first and link
    let gasLibAddress = null;
    try {
      const GasFactory = await ethers.getContractFactory('GasOptimizationUtils');
      const gasLib = await GasFactory.deploy();
      await gasLib.deployed();
      gasLibAddress = gasLib.address;
      console.log('Deployed GasOptimizationUtils at', gasLibAddress);
    } catch (linkErr) {
      // library may not be needed or already inlined; log and continue
      console.warn(
        'GasOptimizationUtils deploy/link skipped:',
        linkErr && linkErr.message ? linkErr.message : linkErr,
      );
    }

    let FacetFactory;
    if (gasLibAddress) {
      // Use fully qualified library name used by Hardhat artifacts when linking
      const libraries = {
        'contracts/utils/GasOptimizationUtils.sol:GasOptimizationUtils': gasLibAddress,
      };
      FacetFactory = await ethers.getContractFactory('ExampleFacetA', { libraries });
    } else {
      FacetFactory = await ethers.getContractFactory('ExampleFacetA');
    }

    facet = await FacetFactory.deploy();
    await facet.deployed();
    console.log('Deployed ExampleFacetA at', facet.address);
  } catch (err) {
    console.warn(
      'ExampleFacetA not found or failed to deploy, falling back to deployer as facet (may revert)',
      err && err.message ? err.message : err,
    );
    facet = { address: deployer.address };
  }

  const facets = [facet.address];
  // compute on-chain code hash for the deployed facet
  let codehash = ethers.constants.HashZero;
  try {
    const code = await ethers.provider.getCode(facet.address);
    codehash = ethers.utils.keccak256(code);
  } catch (err) {
    console.warn('Failed to fetch code for facet:', err && err.message ? err.message : err);
  }
  const codehashes = [codehash];
  // proofs is an array of bytes32[]; for a single-leaf tree the proof can be an empty array
  const proofs = [[]];
  // isRight is a bool[][] matching proofs; provide a single empty inner array
  const isRight = [[]];

  // Compute the leaf value matching OrderedMerkle.leafOfSelectorRoute:
  // leaf = keccak256(abi.encodePacked(bytes1(0x00), selector, facet, codehash))
  const leaf = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['bytes1', 'bytes4', 'address', 'bytes32'],
      ['0x00', selectors[0], facets[0], codehashes[0]],
    ),
  );

  // Commit the root to make applyRoutes callable (commitRoot requires COMMIT_ROLE which deployer has)
  // ensure deploy completion (already awaited above); no-op placeholder
  try {
    // For a Merkle tree the on-chain "root" is the hashed node values. For
    // a single-leaf tree the root == _hashLeaf(leaf) == keccak256(0x00 || leaf).
    const root = ethers.utils.keccak256(ethers.utils.concat(['0x00', leaf]));
    const commitTx = await (await dispatcher.commitRoot(root, 1)).wait();
    console.log('Committed root', root, 'tx:', commitTx.transactionHash);
  } catch (err) {
    console.error('commitRoot failed:', err && err.message ? err.message : err);
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
    console.error('estimateGas failed:', err && err.message ? err.message : err);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
