// SPDX-License-Identifier: MIT
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ethers } from 'hardhat';
import type { ContractFactory } from 'ethers';

/**
 * Deploys diamond + facets and performs the initial diamond cut.
 * v6-safe (no .deployed(), no ethers.utils), TypeChain-friendly.
 */

type Address = string;

interface Cut {
  facetAddress: Address;
  action: number; // 0:Add 1:Replace 2:Remove (use your enum if generated)
  functionSelectors: string[];
}

export async function deployDiamond(hre?: HardhatRuntimeEnvironment) {
  const hh = hre ?? require('hardhat');
  const { network } = hh;
  const [deployer] = await ethers.getSigners();

  console.log('🚀 Deploying with:', await deployer.getAddress(), 'on', network.name);

  // 1) Deploy Diamond core (replace names if different in your repo)
  const DiamondFactory: ContractFactory = await ethers.getContractFactory('Diamond');
  const diamond: any = await DiamondFactory.deploy();
  await diamond.waitForDeployment();
  const diamondAddr = await diamond.getAddress();
  console.log('💎 Diamond:', diamondAddr);

  // 2) Deploy facets (add/remove to match your set)
  const facetNames = [
    'CutFacet',
    'LoupeFacet', // loupe lives in diamond layer; keep if your impl requires
    'AccessControlFacet',
    'PauseFacet',
    'RefactorSafetyFacet',
  ];

  const facets: Record<string, Address> = {};
  for (const name of facetNames) {
    const Fac: ContractFactory = await ethers.getContractFactory(name);
    const f: any = await Fac.deploy();
    await f.waitForDeployment();
    const addr = await f.getAddress();
    facets[name] = addr;
    console.log(`🧩 ${name}: ${addr}`);
  }

  // 3) Build cut (selectors must be keccak-based; use your ABI map if generated)
  const ifaceSighashes = async (artifactName: string) => {
    const factory = await ethers.getContractFactory(artifactName);
    const abi = (factory.interface as any).fragments
      .filter((fr: any) => fr.type === 'function')
      .map((fr: any) => (factory.interface as any).getSighash(fr));
    return abi as string[];
  };

  const cut: Cut[] = [];
  for (const name of facetNames) {
    const selectors = await ifaceSighashes(name);
    cut.push({
      facetAddress: facets[name],
      action: 0, // Add
      functionSelectors: selectors,
    });
  }

  // 4) Perform the cut via CutFacet (or your dispatcher/manifest if different)
  const diamondCut = await ethers.getContractAt('IDiamondCut', diamondAddr);
  const initAddr: Address = '0x0000000000000000000000000000000000000000';
  const initCalldata = '0x';

  console.log('✂️  diamondCut applying...');
  const tx = await diamondCut.diamondCut(cut, initAddr, initCalldata);
  await tx.wait();
  console.log('✅ diamondCut applied');

  return { diamond: diamondAddr, facets };
}

// Allow `npx hardhat run` direct execution
if (require.main === module) {
  deployDiamond()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
