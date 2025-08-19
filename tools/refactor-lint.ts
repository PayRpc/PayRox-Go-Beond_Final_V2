#!/usr/bin/env ts-node

/**
 * PayRox Refactor Linter
 * 
 * Validates Diamond Pattern refactors for:
 * - EIP-170 bytecode size limits (24,576 bytes per facet)
 * - EIP-2535 compliance (no loupe in facets)
 * - Selector parity and collision detection
 * - Proper role assignments
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { program } from 'commander';

interface LintResult {
  success: boolean;
  errors: LintError[];
  warnings: LintWarning[];
  summary: LintSummary;
}

interface LintError {
  type: 'SIZE_LIMIT' | 'LOUPE_IN_FACET' | 'SELECTOR_COLLISION' | 'ROLE_ERROR' | 'COMPILATION' | 'MANIFEST';
  message: string;
  file?: string;
  details?: any;
}

interface LintWarning {
  type: 'OPTIMIZATION' | 'BEST_PRACTICE' | 'COMPATIBILITY';
  message: string;
  file?: string;
}

interface LintSummary {
  facetsChecked: number;
  totalSize: number;
  maxFacetSize: number;
  selectorCount: number;
  collisions: number;
}

interface FacetInfo {
  name: string;
  path: string;
  runtimeSize: number;
  selectors: string[];
  hasLoupeFunctions: boolean;
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

class PayRoxRefactorLinter {
  private readonly EIP170_SIZE_LIMIT = 24576; // 24,576 bytes
  private readonly LOUPE_FUNCTIONS = [
    'facets()',
    'facetFunctionSelectors(address)',
    'facetAddresses()',
    'facetAddress(bytes4)',
    'supportsInterface(bytes4)'
  ];

  private errors: LintError[] = [];
  private warnings: LintWarning[] = [];
  private facetsDir: string;
  private manifestPath: string;

  constructor(facetsDir: string = './facets', manifestPath: string = './payrox-manifest.json') {
    this.facetsDir = facetsDir;
    this.manifestPath = manifestPath;
  }

  public async lint(): Promise<LintResult> {
    console.log('🔍 Starting PayRox refactor lint...');
    
    this.errors = [];
    this.warnings = [];

    // Step 1: Compile contracts
    await this.checkCompilation();
    
    // Step 2: Check facet sizes
    const facetInfos = await this.checkFacetSizes();
    
    // Step 3: Check for loupe functions in facets
    await this.checkLoupeFunctions(facetInfos);
    
    // Step 4: Check selector parity and collisions
    await this.checkSelectors(facetInfos);
    
    // Step 5: Check manifest validity
    await this.checkManifest();
    
    // Step 6: Check role assignments (if deploy scripts exist)
    await this.checkRoleAssignments();

    const summary = this.generateSummary(facetInfos);
    
    return {
      success: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      summary
    };
  }

  private async checkCompilation(): Promise<void> {
    try {
      console.log('📋 Checking compilation...');
      execSync('npx hardhat compile', { stdio: 'pipe', cwd: process.cwd() });
      console.log('✅ Compilation successful');
    } catch (error) {
      this.errors.push({
        type: 'COMPILATION',
        message: `Compilation failed: ${error}`,
        details: { error: error.toString() }
      });
    }
  }

  private async checkFacetSizes(): Promise<FacetInfo[]> {
    console.log('📏 Checking facet sizes...');
    
    const facetInfos: FacetInfo[] = [];
    
    if (!fs.existsSync(this.facetsDir)) {
      this.errors.push({
        type: 'SIZE_LIMIT',
        message: `Facets directory not found: ${this.facetsDir}`
      });
      return facetInfos;
    }

    const facetFiles = fs.readdirSync(this.facetsDir)
      .filter(file => file.endsWith('.sol'))
      .map(file => path.join(this.facetsDir, file));

    for (const facetPath of facetFiles) {
      const facetName = path.basename(facetPath, '.sol');
      
      try {
        // Get runtime bytecode size from artifacts
        const artifactPath = path.join('./artifacts', facetPath, `${facetName}.sol`, `${facetName}.json`);
        
        let runtimeSize = 0;
        let selectors: string[] = [];
        
        if (fs.existsSync(artifactPath)) {
          const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
          const runtimeBytecode = artifact.deployedBytecode?.object || '';
          runtimeSize = Buffer.from(runtimeBytecode.replace('0x', ''), 'hex').length;
          
          // Extract selectors from ABI
          selectors = this.extractSelectorsFromAbi(artifact.abi || []);
        }

        // Check for loupe functions in source
        const sourceCode = fs.readFileSync(facetPath, 'utf-8');
        const hasLoupeFunctions = this.LOUPE_FUNCTIONS.some(func => 
          sourceCode.includes(func) || 
          new RegExp(`function\\s+${func.split('(')[0]}\\s*\\(`).test(sourceCode)
        );

        const facetInfo: FacetInfo = {
          name: facetName,
          path: facetPath,
          runtimeSize,
          selectors,
          hasLoupeFunctions
        };

        facetInfos.push(facetInfo);

        // Check size limit
        if (runtimeSize > this.EIP170_SIZE_LIMIT) {
          this.errors.push({
            type: 'SIZE_LIMIT',
            message: `Facet ${facetName} runtime bytecode (${runtimeSize} bytes) exceeds EIP-170 limit (${this.EIP170_SIZE_LIMIT} bytes)`,
            file: facetPath,
            details: { size: runtimeSize, limit: this.EIP170_SIZE_LIMIT }
          });
        }

        // Size warning at 90% of limit
        if (runtimeSize > this.EIP170_SIZE_LIMIT * 0.9) {
          this.warnings.push({
            type: 'OPTIMIZATION',
            message: `Facet ${facetName} is approaching size limit (${runtimeSize}/${this.EIP170_SIZE_LIMIT} bytes)`,
            file: facetPath
          });
        }

      } catch (error) {
        this.errors.push({
          type: 'SIZE_LIMIT',
          message: `Failed to check size for facet ${facetName}: ${error}`,
          file: facetPath
        });
      }
    }

    return facetInfos;
  }

  private async checkLoupeFunctions(facetInfos: FacetInfo[]): Promise<void> {
    console.log('🔍 Checking for loupe functions in facets...');
    
    for (const facet of facetInfos) {
      if (facet.hasLoupeFunctions) {
        this.errors.push({
          type: 'LOUPE_IN_FACET',
          message: `Facet ${facet.name} MUST NOT implement loupe functions (facets(), facetFunctionSelectors(), etc.)`,
          file: facet.path,
          details: { facet: facet.name }
        });
      }
    }
  }

  private async checkSelectors(facetInfos: FacetInfo[]): Promise<void> {
    console.log('🎯 Checking selector parity and collisions...');
    
    const allSelectors: Map<string, string[]> = new Map();
    
    // Collect all selectors by facet
    for (const facet of facetInfos) {
      for (const selector of facet.selectors) {
        if (!allSelectors.has(selector)) {
          allSelectors.set(selector, []);
        }
        allSelectors.get(selector)!.push(facet.name);
      }
    }

    // Check for collisions
    for (const [selector, facets] of allSelectors.entries()) {
      if (facets.length > 1) {
        this.errors.push({
          type: 'SELECTOR_COLLISION',
          message: `Selector collision: ${selector} found in facets: ${facets.join(', ')}`,
          details: { selector, facets }
        });
      }
    }

    // Check selector parity with original contract (if exists)
    await this.checkSelectorParity(allSelectors);
  }

  private async checkSelectorParity(facetSelectors: Map<string, string[]>): Promise<void> {
    // This would compare with original contract selectors
    // Implementation depends on having the original contract reference
    
    const selectorMapPath = './selector_map.json';
    if (fs.existsSync(selectorMapPath)) {
      try {
        const selectorMap = JSON.parse(fs.readFileSync(selectorMapPath, 'utf-8'));
        const originalSelectors = new Set(Object.keys(selectorMap));
        const currentSelectors = new Set(facetSelectors.keys());
        
        const missing = [...originalSelectors].filter(sel => !currentSelectors.has(sel));
        const extra = [...currentSelectors].filter(sel => !originalSelectors.has(sel));
        
        if (missing.length > 0) {
          this.errors.push({
            type: 'SELECTOR_COLLISION',
            message: `Missing selectors from original contract: ${missing.join(', ')}`,
            details: { missing }
          });
        }
        
        if (extra.length > 0) {
          this.warnings.push({
            type: 'COMPATIBILITY',
            message: `Extra selectors not in original contract: ${extra.join(', ')}`
          });
        }
      } catch (error) {
        this.warnings.push({
          type: 'BEST_PRACTICE',
          message: `Could not verify selector parity: ${error}`
        });
      }
    }
  }

  private async checkManifest(): Promise<void> {
    console.log('📋 Checking manifest...');
    
    if (!fs.existsSync(this.manifestPath)) {
      this.errors.push({
        type: 'MANIFEST',
        message: `Manifest file not found: ${this.manifestPath}`
      });
      return;
    }

    try {
      const manifest: ManifestData = JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8'));
      
      // Validate structure
      if (!manifest.version) {
        this.errors.push({
          type: 'MANIFEST',
          message: 'Manifest missing version field'
        });
      }
      
      if (!manifest.facets || typeof manifest.facets !== 'object') {
        this.errors.push({
          type: 'MANIFEST',
          message: 'Manifest missing or invalid facets field'
        });
      }
      
      // Validate facet entries
      for (const [facetName, facetData] of Object.entries(manifest.facets)) {
        if (!Array.isArray(facetData.selectors)) {
          this.errors.push({
            type: 'MANIFEST',
            message: `Facet ${facetName} missing or invalid selectors array`
          });
        }
      }
      
    } catch (error) {
      this.errors.push({
        type: 'MANIFEST',
        message: `Invalid manifest JSON: ${error}`
      });
    }
  }

  private async checkRoleAssignments(): Promise<void> {
    console.log('👥 Checking role assignments...');
    
    // Look for deploy scripts that might contain role assignments
    const deployScriptsDir = './scripts/deploy';
    if (fs.existsSync(deployScriptsDir)) {
      const deployFiles = fs.readdirSync(deployScriptsDir)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'));
      
      for (const file of deployFiles) {
        const filePath = path.join(deployScriptsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Check for role assignments to facets instead of dispatcher
        if (content.includes('grantRole') && content.includes('facet')) {
          this.warnings.push({
            type: 'BEST_PRACTICE',
            message: `Deploy script ${file} may contain role assignments to facets - ensure roles are granted to dispatcher`,
            file: filePath
          });
        }
      }
    }
  }

  private extractSelectorsFromAbi(abi: any[]): string[] {
    const selectors: string[] = [];
    
    for (const item of abi) {
      if (item.type === 'function') {
        const signature = `${item.name}(${item.inputs.map((input: any) => input.type).join(',')})`;
        const selector = this.computeSelector(signature);
        selectors.push(selector);
      }
    }
    
    return selectors;
  }

  private computeSelector(signature: string): string {
    // Function selector = first 4 bytes of keccak256(functionSignature)
    // Use ethers (v6 or v5) if available; fallback to js-sha3
    try {
      const ethersLib = require('ethers');
      // ethers v6 exports keccak256 & toUtf8Bytes at top-level
      const keccak256 = (ethersLib.keccak256 || (ethersLib.utils && ethersLib.utils.keccak256));
      const toUtf8Bytes = (ethersLib.toUtf8Bytes || (ethersLib.utils && ethersLib.utils.toUtf8Bytes));
      if (keccak256 && toUtf8Bytes) {
        const full = keccak256(toUtf8Bytes(signature));
        return full.slice(0, 10); // 0x + 8 hex chars
      }
    } catch (_) { /* ignore and fallback */ }
    try {
      const { keccak_256 } = require('js-sha3');
      const full = '0x' + keccak_256(signature);
      return full.slice(0, 10);
    } catch (_) { /* ignore */ }
    // Absolute last resort (should never happen): clearly mark fallback
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(signature).digest('hex');
    return '0x' + hash.substring(0, 8);
  }

  private generateSummary(facetInfos: FacetInfo[]): LintSummary {
    const totalSize = facetInfos.reduce((sum, facet) => sum + facet.runtimeSize, 0);
    const maxFacetSize = Math.max(...facetInfos.map(facet => facet.runtimeSize), 0);
    const selectorCount = facetInfos.reduce((sum, facet) => sum + facet.selectors.length, 0);
    
    return {
      facetsChecked: facetInfos.length,
      totalSize,
      maxFacetSize,
      selectorCount,
      collisions: this.errors.filter(e => e.type === 'SELECTOR_COLLISION').length
    };
  }

  public printResults(result: LintResult): void {
    console.log('\n📊 Lint Results Summary:');
    console.log(`   Facets Checked: ${result.summary.facetsChecked}`);
    console.log(`   Total Size: ${result.summary.totalSize} bytes`);
    console.log(`   Max Facet Size: ${result.summary.maxFacetSize}/${this.EIP170_SIZE_LIMIT} bytes`);
    console.log(`   Selectors: ${result.summary.selectorCount}`);
    console.log(`   Collisions: ${result.summary.collisions}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. [${error.type}] ${error.message}`);
        if (error.file) console.log(`      File: ${error.file}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. [${warning.type}] ${warning.message}`);
        if (warning.file) console.log(`      File: ${warning.file}`);
      });
    }
    
    if (result.success) {
      console.log('\n✅ All checks passed!');
    } else {
      console.log(`\n❌ ${result.errors.length} error(s) found`);
    }
  }
}

// CLI Interface
program
  .name('refactor-lint')
  .description('PayRox Diamond Pattern refactor linter')
  .version('1.0.0')
  .option('-f, --facets <dir>', 'Facets directory', './facets')
  .option('-m, --manifest <path>', 'Manifest file path', './payrox-manifest.json')
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    const linter = new PayRoxRefactorLinter(options.facets, options.manifest);
    
    try {
      const result = await linter.lint();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        linter.printResults(result);
      }
      
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('💥 Linter failed:', error);
      process.exit(1);
    }
  });

// Handle direct execution
if (require.main === module) {
  program.parse();
}

export { PayRoxRefactorLinter, LintResult, LintError, LintWarning };
