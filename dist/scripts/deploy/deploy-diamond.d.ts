/**
 * PayRox Diamond Deployment Script Template
 *
 * Deploys Diamond Pattern contracts with:
 * - CREATE2 deterministic addresses
 * - Proper role assignments to dispatcher
 * - Epoch-based routing system
 * - Verification and validation
 */
import { Contract } from 'ethers';
interface DeploymentConfig {
  facetsDir: string;
  manifestPath: string;
  salt: string;
  verify: boolean;
}
declare class DiamondDeployer {
  private config;
  private manifest;
  private deployedFacets;
  constructor(config: DeploymentConfig);
  private loadManifest;
  deploy(): Promise<{
    diamond: Contract;
    facets: Map<string, Contract>;
  }>;
  private deployFacets;
  private deployDiamond;
  private initializeDiamond;
  private verifyDeployment;
  private updateManifest;
  private getFunctionSelectors;
  private setupRoles;
}
export { DiamondDeployer, DeploymentConfig };
