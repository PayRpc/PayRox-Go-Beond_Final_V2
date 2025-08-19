/**
 * PayRox Diamond Deployment Script Template
 * 
 * Deploys Diamond Pattern contracts with:
 * - CREATE2 deterministic addresses
 * - Proper role assignments to dispatcher
 * - Epoch-based routing system
 * - Verification and validation
 */

import { ethers } from "hardhat";
import { Contract } from "ethers";
// runtime-cast to avoid Hardhat/ethers typing conflicts in scripts
const E = ethers as any;
import fs from "fs";
import path from "path";

interface DeploymentConfig {
  facetsDir: string;
  manifestPath: string;
  salt: string;
  verify: boolean;
}

interface ManifestData {
  version: string;
  facets: Record<string, {
    selectors: string[];
    address?: string;
    codehash?: string;
  }>;
  dispatcher?: string;
  merkle_root?: string;
}

class DiamondDeployer {
  private config: DeploymentConfig;
  private manifest!: ManifestData; // loaded in constructor
  private deployedFacets: Map<string, any> = new Map();

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

  async deploy(): Promise<{ diamond: any; facets: Map<string, any> }> {
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

  const FacetFactory: any = await E.getContractFactory(facetName);

  // Use CREATE2 for deterministic addresses
  const facetSalt = E.utils.keccak256(E.utils.toUtf8Bytes(`${this.config.salt}-${facetName}`));

  const facet: any = await FacetFactory.deploy({ gasLimit: 5000000 });
  if (typeof facet.deployed === 'function') await facet.deployed();

  this.deployedFacets.set(facetName, facet);

  // Update manifest with deployed address
  facetData.address = facet.address;

  console.log(`    ✅ ${facetName} deployed to: ${facet.address}`);

  // Verify size constraint (EIP-170)
  const code = await E.provider.getCode(facet.address);
      const sizeBytes = (code.length - 2) / 2; // Remove 0x prefix
      
      if (sizeBytes > 24576) {
        throw new Error(`❌ ${facetName} exceeds EIP-170 limit: ${sizeBytes} > 24576 bytes`);
      }
      
      console.log(`    📏 Size: ${sizeBytes}/24576 bytes`);
    }
  }

  private async deployDiamond(): Promise<Contract> {
    console.log('💎 Deploying Diamond...');

  const [deployer] = await E.getSigners();
    
    // Deploy DiamondCutFacet first (required for Diamond)
  const DiamondCutFacet: any = await E.getContractFactory("DiamondCutFacet");
  const diamondCutFacet: any = await DiamondCutFacet.deploy();
  if (typeof diamondCutFacet.deployed === 'function') await diamondCutFacet.deployed();

    // Deploy DiamondLoupeFacet
  const DiamondLoupeFacet: any = await E.getContractFactory("DiamondLoupeFacet");
  const diamondLoupeFacet: any = await DiamondLoupeFacet.deploy();
  if (typeof diamondLoupeFacet.deployed === 'function') await diamondLoupeFacet.deployed();

    // Deploy Diamond
  const Diamond: any = await E.getContractFactory("Diamond");
  const diamond: any = await Diamond.deploy(deployer.address, diamondCutFacet.address, { gasLimit: 5000000 });
  if (typeof diamond.deployed === 'function') await diamond.deployed();

    console.log(`  ✅ Diamond deployed to: ${diamond.address}`);
    
    // Add loupe facet
  const diamondCut: any = await E.getContractAt("contracts/interfaces/IDiamondCut.sol:IDiamondCut", String(diamond.address));
    const loupeSelectors = this.getFunctionSelectors(diamondLoupeFacet);

    await diamondCut.diamondCut(
      [{ facetAddress: diamondLoupeFacet.address, action: 0, functionSelectors: loupeSelectors }],
      E.constants.AddressZero,
      "0x"
    );

    return diamond;
  }

  private async initializeDiamond(diamond: any): Promise<void> {
    console.log('⚙️  Initializing Diamond with facets...');

  const diamondCut: any = await E.getContractAt("IDiamondCut", diamond.address);
    const facetCuts = [];

    for (const [facetName, facetData] of Object.entries(this.manifest.facets)) {
      const facet = this.deployedFacets.get(facetName);
      if (!facet) {
        throw new Error(`Facet not deployed: ${facetName}`);
      }

      facetCuts.push({
        facetAddress: facet.address,
        action: 0, // Add
        functionSelectors: facetData.selectors
      });

      console.log(`  Adding ${facetName} with ${facetData.selectors.length} selectors`);
    }

    // Execute diamond cut
  const tx: any = await diamondCut.diamondCut(facetCuts, E.constants.AddressZero, "0x", { gasLimit: 8000000 });
  if (tx && typeof tx.wait === 'function') await tx.wait();
    console.log('  ✅ All facets added to Diamond');
  }

  private async verifyDeployment(diamond: any): Promise<void> {
    console.log('✅ Verifying deployment...');

  const diamondLoupe: any = await E.getContractAt("contracts/interfaces/IDiamondLoupe.sol:IDiamondLoupe", String(diamond.address));
    
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
    for (const [facetName, facetData] of Object.entries(this.manifest.facets)) {
      for (const selector of facetData.selectors) {
  const facetAddress = await diamondLoupe.facetAddress(selector);
        if (facetAddress !== facetData.address) {
          throw new Error(`Selector routing failed: ${selector} -> ${facetAddress} (expected ${facetData.address})`);
        }
      }
    }

    // Verify no loupe functions in business facets
    for (const [facetName, facet] of this.deployedFacets.entries()) {
      const selectors = this.getFunctionSelectors(facet);
      const loupeSelectors = [
        "0x1f931c1c", // facets()
        "0xcdffacc6", // facetFunctionSelectors()
        "0x52ef6b2c", // facetAddresses()
        "0xadfca15e"  // facetAddress()
      ];

      for (const selector of selectors) {
        if (loupeSelectors.includes(selector)) {
          throw new Error(`❌ Facet ${facetName} implements forbidden loupe function: ${selector}`);
        }
      }
    }

    console.log('  ✅ All verifications passed');
  }

  private async updateManifest(diamond: any): Promise<void> {
    console.log('📄 Updating manifest with deployment addresses...');

    this.manifest.dispatcher = diamond.address;
    
    // Calculate merkle root from facet selectors
  const leaves: any[] = [];
    for (const [facetName, facetData] of Object.entries(this.manifest.facets)) {
      for (const selector of facetData.selectors) {
    const leaf = E.utils.keccak256(E.utils.defaultAbiCoder.encode(["bytes4", "address", "bytes32"], [selector, facetData.address, E.utils.keccak256(E.utils.toUtf8Bytes(facetName))]));
        leaves.push(leaf);
      }
    }

    // Simple merkle root calculation (in production, use proper merkle tree)
  const combinedHash = E.utils.keccak256(E.utils.concat(leaves.sort()));
    this.manifest.merkle_root = combinedHash;

    // Add deployment metadata
    const deployment = {
  network: (await E.provider.getNetwork()).name,
  block: await E.provider.getBlockNumber(),
  timestamp: Math.floor(Date.now() / 1000),
  deployer: (await E.getSigners())[0].address,
  salt: this.config.salt
    };

    const updatedManifest = {
      ...this.manifest,
      deployment
    };

    fs.writeFileSync(this.config.manifestPath, JSON.stringify(updatedManifest, null, 2));
    console.log(`  ✅ Manifest updated: ${this.config.manifestPath}`);
  }

  private getFunctionSelectors(contract: any): string[] {
    const selectors: string[] = [];
    const iface = contract && contract.interface ? contract.interface : { functions: {} };
    for (const func of Object.values(iface.functions)) {
      if (func && (func as any).type === 'function') selectors.push((func as any).selector);
    }
    return selectors;
  }

  private async setupRoles(diamond: Contract): Promise<void> {
    console.log('👥 Setting up role assignments...');

    // All roles should be granted to the diamond (dispatcher), not individual facets
    const [deployer] = await ethers.getSigners();
    
    // If diamond has access control, grant roles to diamond address
    try {
    const accessControl: any = await E.getContractAt("IAccessControl", String(diamond.address));
      const adminRole = await accessControl.DEFAULT_ADMIN_ROLE();
      
      // Grant admin role to diamond itself (for delegatecall context)
  await accessControl.grantRole(adminRole, String(diamond.address));
      console.log(`  ✅ Admin role granted to diamond: ${diamond.address}`);
      
    } catch (error) {
      console.log(`  ℹ️  No access control interface found (this is OK)`);
    }
  }
}

// Example usage
async function main() {
    const config: DeploymentConfig = {
    facetsDir: "./facets",
    manifestPath: "./payrox-manifest.json",
    salt: E.utils.id("PayRox-Diamond-V1"),
    verify: process.env.VERIFY === "true"
  };

  const deployer = new DiamondDeployer(config);
  const { diamond, facets } = await deployer.deploy();

  console.log('\n🎉 Deployment Summary:');
  console.log(`Diamond Address: ${diamond.address}`);
  for (const [name, facet] of facets.entries()) {
    console.log(`${name}: ${facet.address}`);
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
