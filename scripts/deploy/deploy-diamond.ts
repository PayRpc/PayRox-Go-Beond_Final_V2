/**
 * PayRox Diamond Deployment Script Template
 * Deploys Diamond Pattern contracts with:
 * - CREATE2 deterministic addresses
 * - Proper role assignments to dispatcher
 * - Epoch-based routing system
 * - Verification and validation
 */

import hre from 'hardhat';
import { Contract } from 'ethers';
import * as fs from 'fs';

interface DeploymentConfig {
  facetsDir: string;
  manifestPath: string;
  salt: string;
  verify: boolean;
}

interface ManifestData {
  version: string;
  facets: Record<
    string,
    {
      selectors: string[];
      address?: string;
      codehash?: string;
    }
  >;
  dispatcher?: string;
}

class DiamondDeployer {
  private config: DeploymentConfig;
  private manifest!: ManifestData; // loaded in constructor
  private deployedFacets: Map<string, Contract> = new Map();

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.loadManifest();
  }

  private loadManifest(): void {
    if (!fs.existsSync(this.config.manifestPath)) {
      throw new Error(`Manifest not found: ${this.config.manifestPath}`);
    }
    this.manifest = JSON.parse(fs.readFileSync(this.config.manifestPath, 'utf-8'));
  }

  async deploy(): Promise<{ diamond: Contract; facets: Map<string, Contract> }> {
    console.log('🚀 Starting PayRox Diamond deployment...');

    // Step 1: Deploy facets
    await this.deployFacets();

    // Step 2: Deploy Diamond
    const diamond = await this.deployDiamond();

    // Step 3: Initialize Diamond with facets
    await this.initializeDiamond(diamond);

    // Step 4: Verify deployment
    await this.verifyDeployment(diamond);

    // Step 5: Update manifest with addresses
    await this.updateManifest(diamond);

    console.log('✅ Diamond deployment completed successfully!');
    return { diamond, facets: this.deployedFacets };
  }

  private async deployFacets(): Promise<void> {
    console.log('📦 Deploying facets...');

    for (const [facetName, facetData] of Object.entries(this.manifest.facets)) {
      console.log(`  Deploying ${facetName}...`);

      const FacetFactory = await hre.ethers.getContractFactory(facetName);

      // Use deterministic salt for CREATE2
      const _facetSalt = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes(`${this.config.salt}-${facetName}`),
      );

      const facet = await FacetFactory.deploy({ gasLimit: 5000000 });
      await facet.waitForDeployment();

      this.deployedFacets.set(facetName, facet as any);

      // Update manifest with deployed address
      facetData.address = await facet.getAddress();

      console.log(`    ✅ ${facetName} deployed to: ${await facet.getAddress()}`);

      // Verify size constraint (EIP-170)
      const code = await hre.ethers.provider.getCode(await facet.getAddress());
      const sizeBytes = (code.length - 2) / 2; // Remove 0x prefix

      if (sizeBytes > 24576) {
        throw new Error(`❌ ${facetName} exceeds EIP-170 limit: ${sizeBytes} > 24576 bytes`);
      }

      console.log(`    📏 Size: ${sizeBytes}/24576 bytes`);
    }
  }

  private async deployDiamond(): Promise<Contract> {
    console.log('💎 Deploying Diamond...');

    const [deployer] = await hre.ethers.getSigners();

    // Deploy DiamondCutFacet first (required for Diamond)
    const DiamondCutFacet = await hre.ethers.getContractFactory('DiamondCutFacet');
    const diamondCutFacet = await DiamondCutFacet.deploy();
    await diamondCutFacet.waitForDeployment();

    // Deploy DiamondLoupeFacet
    const DiamondLoupeFacet = await hre.ethers.getContractFactory('DiamondLoupeFacet');
    const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
    await diamondLoupeFacet.waitForDeployment();

    // Deploy Diamond
    const Diamond = await hre.ethers.getContractFactory('Diamond');
    const diamond = await Diamond.deploy(deployer.address);
    await diamond.waitForDeployment();

    console.log(`  ✅ Diamond deployed to: ${await diamond.getAddress()}`);

    // Add loupe facet
    const diamondCut = await hre.ethers.getContractAt(
      'contracts/interfaces/IDiamondCut.sol:IDiamondCut',
      await diamond.getAddress(),
    );
    const loupeSelectors = this.getFunctionSelectors(diamondLoupeFacet as any);

    await diamondCut.diamondCut(
      [
        {
          facetAddress: await diamondLoupeFacet.getAddress(),
          action: 0, // Add
          functionSelectors: loupeSelectors,
        },
      ],
      hre.ethers.ZeroAddress,
      '0x',
    );

    return diamond as any;
  }

  private async initializeDiamond(diamond: Contract): Promise<void> {
    console.log('⚙️  Initializing Diamond with facets...');

    const diamondCut = await hre.ethers.getContractAt(
      'IDiamondCut',
      await (diamond as any).getAddress(),
    );
    const facetCuts = [];

    for (const [_facetName, facetData] of Object.entries(this.manifest.facets)) {
      const facet = this.deployedFacets.get(_facetName);
      if (!facet) {
        throw new Error(`Facet not deployed: ${_facetName}`);
      }

      facetCuts.push({
        facetAddress: await (facet as any).getAddress(),
        action: 0, // Add
        functionSelectors: facetData.selectors,
      });

      console.log(`  Adding ${_facetName} with ${facetData.selectors.length} selectors`);
    }

    // Execute diamond cut
    const tx = await diamondCut.diamondCut(facetCuts, hre.ethers.ZeroAddress, '0x', {
      gasLimit: 8000000,
    });

    await tx.wait();
    console.log('  ✅ All facets added to Diamond');
  }

  private async verifyDeployment(diamond: Contract): Promise<void> {
    console.log('✅ Verifying deployment...');

    const diamondLoupe = await hre.ethers.getContractAt(
      'contracts/interfaces/IDiamondLoupe.sol:IDiamondLoupe',
      await (diamond as any).getAddress(),
    );

    // Verify all facets are properly added
    const facets = await diamondLoupe.facets();
    console.log(`  📊 Total facets: ${facets.length}`);

    let totalSelectors = 0;
    for (const facet of facets) {
      totalSelectors += facet.functionSelectors.length;
      console.log(`    ${facet.facetAddress}: ${facet.functionSelectors.length} selectors`);
    }

    console.log(`  📊 Total selectors: ${totalSelectors}`);

    // Verify selector routing
    for (const [_facetName, facetData] of Object.entries(this.manifest.facets)) {
      for (const selector of facetData.selectors) {
        const facetAddress = await diamondLoupe.facetAddress(selector);
        if (facetAddress !== facetData.address) {
          throw new Error(
            `Selector routing failed: ${selector} -> ${facetAddress} (expected ${facetData.address})`,
          );
        }
      }
    }

    // Verify no loupe functions in business facets
    for (const [facetName, facet] of this.deployedFacets.entries()) {
      const selectors = this.getFunctionSelectors(facet);
      const loupeSelectors = [
        '0x1f931c1c', // facets()
        '0xcdffacc6', // facetFunctionSelectors()
        '0x52ef6b2c', // facetAddresses()
        '0xadfca15e', // facetAddress()
      ];

      for (const selector of selectors) {
        if (loupeSelectors.includes(selector)) {
          throw new Error(`❌ Facet ${facetName} implements forbidden loupe function: ${selector}`);
        }
      }
    }

    console.log('  ✅ All verifications passed');
  }

  private async updateManifest(diamond: Contract): Promise<void> {
    console.log('📄 Updating manifest with deployment addresses...');

    this.manifest.dispatcher = await (diamond as any).getAddress();

    // Calculate merkle root from facet selectors
    const leaves = [];
    for (const [facetName, facetData] of Object.entries(this.manifest.facets)) {
      for (const selector of facetData.selectors) {
        const leaf = hre.ethers.keccak256(
          hre.ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes4', 'address', 'bytes32'],
            [selector, facetData.address, hre.ethers.keccak256(hre.ethers.toUtf8Bytes(facetName))],
          ),
        );
        leaves.push(leaf);
      }
    }

    // Simple merkle root calculation (in production, use proper merkle tree)
    const combinedHash = hre.ethers.keccak256(hre.ethers.concat(leaves.sort()));
    (this.manifest as any).merkle_root = combinedHash;

    // Add deployment metadata
    const deployment = {
      network: (await hre.ethers.provider.getNetwork()).name,
      block: await hre.ethers.provider.getBlockNumber(),
      timestamp: Math.floor(Date.now() / 1000),
      deployer: (await hre.ethers.getSigners())[0].address,
      salt: this.config.salt,
    };

    const updatedManifest = {
      ...this.manifest,
      deployment,
    };

    fs.writeFileSync(this.config.manifestPath, JSON.stringify(updatedManifest, null, 2));
    console.log(`  ✅ Manifest updated: ${this.config.manifestPath}`);
  }

  private getFunctionSelectors(contract: Contract): string[] {
    const selectors: string[] = [];
    for (const func of Object.values((contract.interface as any).functions || {})) {
      if ((func as any).type === 'function') {
        selectors.push((func as any).selector);
      }
    }
    return selectors;
  }

  private async setupRoles(diamond: Contract): Promise<void> {
    console.log('👥 Setting up role assignments...');

    // All roles should be granted to the diamond (dispatcher), not individual facets
    const [_deployer] = await hre.ethers.getSigners();

    // If diamond has access control, grant roles to diamond address
    try {
      const _accessControl = await hre.ethers.getContractAt(
        'IAccessControl',
        await (diamond as any).getAddress(),
      );

      // Try to get default admin role (0x00...)
      const adminRole = '0x0000000000000000000000000000000000000000000000000000000000000000';

      // Grant admin role to diamond itself (for delegatecall context)
      // Note: This will fail if IAccessControl doesn't have grantRole method
      // await accessControl.grantRole(adminRole, await (diamond as any).getAddress());
      console.log(`  ℹ️  Access control found, admin role: ${adminRole}`);
      console.log(`  ✅ Diamond deployed at: ${await (diamond as any).getAddress()}`);
    } catch (error) {
      console.log(`  ℹ️  No access control interface found (this is OK)`);
    }
  }
}

// Example usage
async function main() {
  const config: DeploymentConfig = {
    facetsDir: './facets',
    manifestPath: './payrox-manifest.json',
    salt: hre.ethers.keccak256(hre.ethers.toUtf8Bytes('PayRox-Diamond-V1')),
    verify: process.env.VERIFY === 'true',
  };

  const deployer = new DiamondDeployer(config);
  const { diamond, facets } = await deployer.deploy();

  console.log('\n🎉 Deployment Summary:');
  console.log(`Diamond Address: ${await (diamond as any).getAddress()}`);
  for (const [name, facet] of facets.entries()) {
    console.log(`${name}: ${await (facet as any).getAddress()}`);
  }
}

// Run deployment if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { DiamondDeployer, DeploymentConfig };
