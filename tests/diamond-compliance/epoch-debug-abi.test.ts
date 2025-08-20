import { ethers } from 'hardhat';

function getTarget(c: any) {
  return c?.target ?? c?.address ?? null;
}

async function deployEpochSystemFixture() {
  const [owner] = await ethers.getSigners();

  const EpochManager = await ethers.getContractFactory('EpochManager');
  const epochManager = await EpochManager.deploy();
  await epochManager.waitForDeployment();

  const FacetA = await ethers.getContractFactory('FacetA');
  const facetA = await FacetA.deploy();
  await facetA.waitForDeployment();

  const FacetB = await ethers.getContractFactory('FacetB');
  const facetB = await FacetB.deploy();
  await facetB.waitForDeployment();

  const DiamondWithEpoch = await ethers.getContractFactory('DiamondWithEpoch');
  const diamond = await DiamondWithEpoch.deploy(await owner.getAddress(), epochManager.target);
  await diamond.waitForDeployment();

  return { diamond, epochManager, facetA, facetB };
}

describe('Epoch debug ABI', function () {
  it('prints diamond ABI and available methods', async function () {
    const { diamond } = await deployEpochSystemFixture();
    // Print ABI function names
    const iface = diamond.interface as any;
    console.log('--- Diamond ABI functions ---');
    for (const f of Object.values(iface?.functions || {})) {
      try {
        console.log((f as any).format());
      } catch (e) {
        /* ignore */
      }
    }
    console.log('Address:', getTarget(diamond));
  });
});
