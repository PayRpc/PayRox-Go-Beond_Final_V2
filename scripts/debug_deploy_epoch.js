const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer address:', deployer.address);

  const EpochManager = await hre.ethers.getContractFactory('EpochManager');
  const epochManager = await EpochManager.deploy();
  await epochManager.waitForDeployment();
  console.log(
    'EpochManager deployed at:',
    epochManager.target ? epochManager.target : epochManager.address,
  );

  const FacetA = await hre.ethers.getContractFactory('FacetA');
  const facetA = await FacetA.deploy();
  await facetA.waitForDeployment();
  console.log('FacetA deployed at:', facetA.target ? facetA.target : facetA.address);

  const DiamondWithEpoch = await hre.ethers.getContractFactory('DiamondWithEpoch');
  const diamond = await DiamondWithEpoch.deploy(
    deployer.address,
    epochManager.target ? epochManager.target : epochManager.address,
  );
  await diamond.waitForDeployment();
  console.log('DiamondWithEpoch deployed at:', diamond.target ? diamond.target : diamond.address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
