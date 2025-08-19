#!/usr/bin/env ts-node

/**
 * PayRox AI Refactor Copilot
 * 
 * Self-correcting AI system for Diamond Pattern refactoring with strict validation.
 * Enforces EIP-170 size limits, EIP-2535 compliance, and behavior preservation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { program } from 'commander';

interface RefactorOptions {
  file?: string;
  prompt: string;
  output?: string;
  retries?: number;
  model?: string;
  dryRun?: boolean;
}

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  details?: any;
}

class PayRoxRefactorCopilot {
  private readonly systemPromptPath = path.join(__dirname, 'ai-rulebook', 'system-prompt.txt');
  private readonly maxRetries: number;
  private readonly outputDir: string;

  constructor(options: RefactorOptions) {
    this.maxRetries = options.retries || 3;
    this.outputDir = options.output || './facets';
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private loadSystemPrompt(): string {
    if (!fs.existsSync(this.systemPromptPath)) {
      throw new Error(`System prompt not found at ${this.systemPromptPath}`);
    }
    return fs.readFileSync(this.systemPromptPath, 'utf-8');
  }

  private async generateRefactor(prompt: string, context: string = '', attempt: number = 1): Promise<string> {
    const systemPrompt = this.loadSystemPrompt();
    const fullPrompt = `
${systemPrompt}

CONTEXT:
${context}

USER REQUEST:
${prompt}

ATTEMPT: ${attempt}/${this.maxRetries}

Generate a complete Diamond Pattern refactor following all constraints.
Include all required outputs: facets, manifest, tests, deploy scripts, and report.
End with the mandatory SELF-CHECK footer with all boxes ticked.
    `.trim();

    // Here you would integrate with your AI service (Ollama, OpenAI, etc.)
    // For now, returning a placeholder that demonstrates the expected structure
    return this.callAIService(fullPrompt);
  }

  private async callAIService(prompt: string): Promise<string> {
    // Placeholder for AI service integration
    // In real implementation, this would call Ollama or other AI service
    console.log('🤖 Calling AI service for refactor generation...');
    
    // Simulate AI call - in real implementation, replace with actual AI service
    return `
# PayRox Diamond Refactor Output

## Generated Facets

### AdminFacet.sol
\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libraries/LibAdmin.sol";

contract AdminFacet {
    function setOwner(address newOwner) external {
        LibAdmin.enforceOnlyOwner();
        LibAdmin.setOwner(newOwner);
    }
    
    function getOwner() external view returns (address) {
        return LibAdmin.getOwner();
    }
}
\`\`\`

### CoreFacet.sol
\`\`\`solidity
// SPDX-License-Identifier: MIT  
pragma solidity ^0.8.19;

import "../libraries/LibCore.sol";

contract CoreFacet {
    function processPayment(uint256 amount) external payable {
        LibCore.processPayment(amount);
    }
}
\`\`\`

## Manifest (payrox-manifest.json)
\`\`\`json
{
  "version": "1.0.0",
  "facets": {
    "AdminFacet": {
      "selectors": ["0x13af4035", "0x893d20e8"],
      "address": "0x0000000000000000000000000000000000000000"
    },
    "CoreFacet": {
      "selectors": ["0x12345678"],
      "address": "0x0000000000000000000000000000000000000000"
    }
  },
  "dispatcher": "0x0000000000000000000000000000000000000000",
  "merkle_root": "0x0000000000000000000000000000000000000000000000000000000000000000"
}
\`\`\`

## Tests Generated
- loupe-and-selectors.test.ts
- epoch-rules.test.ts  
- roles-delegatecall.test.ts
- size-and-gas.test.ts

## Deploy Scripts Generated
- deploy-diamond.ts
- verify-deployment.ts

--- SELF-CHECK (tick before submit) ---
[✓] Size OK   [✓] No Loupe in Facets   [✓] Selectors Parity
[✓] Roles→Dispatcher   [✓] Epoch Rules   [✓] Refund Math
[✓] Init Guard
    `;
  }

  private async validateOutput(output: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for mandatory self-check footer
    if (!this.validateSelfCheck(output)) {
      errors.push('Missing or incomplete SELF-CHECK footer');
    }

    // Run compilation check
    try {
      console.log('📋 Running compilation check...');
      execSync('npx hardhat compile', { stdio: 'pipe', cwd: process.cwd() });
    } catch (error) {
      errors.push(`Compilation failed: ${error}`);
    }

    // Run refactor linter
    try {
      console.log('🔍 Running refactor linter...');
      const lintResult = execSync('npm run ai:lint', { stdio: 'pipe', cwd: process.cwd() });
      const lintOutput = lintResult.toString();
      if (lintOutput.includes('ERROR')) {
        errors.push(`Lint errors found: ${lintOutput}`);
      }
      if (lintOutput.includes('WARNING')) {
        warnings.push(`Lint warnings: ${lintOutput}`);
      }
    } catch (error) {
      errors.push(`Linting failed: ${error}`);
    }

    // Run critical tests
    try {
      console.log('🧪 Running critical tests...');
      execSync('npx hardhat test --grep "(loupe|selectors|epoch|roles)"', { 
        stdio: 'pipe', 
        cwd: process.cwd() 
      });
    } catch (error) {
      errors.push(`Critical tests failed: ${error}`);
    }

    return {
      success: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateSelfCheck(output: string): boolean {
    const selfCheckRegex = /--- SELF-CHECK \(tick before submit\) ---\s*\[✓\] Size OK\s*\[✓\] No Loupe in Facets\s*\[✓\] Selectors Parity\s*\[✓\] Roles→Dispatcher\s*\[✓\] Epoch Rules\s*\[✓\] Refund Math\s*\[✓\] Init Guard/;
    return selfCheckRegex.test(output);
  }

  private writeOutput(output: string, attempt: number): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(this.outputDir, `refactor-${timestamp}-attempt-${attempt}.md`);
    fs.writeFileSync(outputFile, output);
    console.log(`📄 Output written to: ${outputFile}`);
  }

  public async refactor(options: RefactorOptions): Promise<void> {
    console.log('🚀 Starting PayRox Diamond Pattern Refactor...');
    
    let context = '';
    if (options.file) {
      if (!fs.existsSync(options.file)) {
        throw new Error(`File not found: ${options.file}`);
      }
      context = `TARGET FILE: ${options.file}\n${fs.readFileSync(options.file, 'utf-8')}`;
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      console.log(`\n🔄 Attempt ${attempt}/${this.maxRetries}`);
      
      try {
        // Generate refactor
        const output = await this.generateRefactor(options.prompt, context, attempt);
        
        if (options.dryRun) {
          console.log('🏃‍♂️ Dry run mode - skipping validation');
          console.log(output);
          return;
        }

        // Write output for inspection
        this.writeOutput(output, attempt);

        // Validate output
        console.log('✅ Validating generated refactor...');
        const validation = await this.validateOutput(output);

        if (validation.success) {
          console.log('🎉 Refactor completed successfully!');
          if (validation.warnings.length > 0) {
            console.log('⚠️  Warnings:');
            validation.warnings.forEach(warning => console.log(`   ${warning}`));
          }
          return;
        } else {
          console.log('❌ Validation failed:');
          validation.errors.forEach(error => console.log(`   ${error}`));
          
          if (attempt < this.maxRetries) {
            console.log('🔧 Preparing retry with error feedback...');
            context += `\n\nPREVIOUS ATTEMPT ERRORS:\n${validation.errors.join('\n')}`;
          }
        }
      } catch (error) {
        console.error(`💥 Attempt ${attempt} failed:`, error);
        if (attempt === this.maxRetries) {
          throw new Error(`All ${this.maxRetries} attempts failed. Last error: ${error}`);
        }
      }
    }

    throw new Error(`Refactor failed after ${this.maxRetries} attempts`);
  }
}

// CLI Interface
program
  .name('ai-refactor-copilot')
  .description('PayRox AI-powered Diamond Pattern refactor assistant')
  .version('1.0.0');

program
  .argument('<prompt>', 'Refactor prompt describing the desired changes')
  .option('-f, --file <path>', 'Target contract file to refactor')
  .option('-o, --output <dir>', 'Output directory for generated files', './facets')
  .option('-r, --retries <number>', 'Maximum retry attempts', '3')
  .option('-m, --model <name>', 'AI model to use', 'codellama:7b-instruct')
  .option('--dry-run', 'Generate output without validation')
  .action(async (prompt: string, options: any) => {
    try {
      const copilot = new PayRoxRefactorCopilot({
        prompt,
        file: options.file,
        output: options.output,
        retries: parseInt(options.retries),
        model: options.model,
        dryRun: options.dryRun
      });

      await copilot.refactor({
        prompt,
        file: options.file,
        output: options.output,
        retries: parseInt(options.retries),
        model: options.model,
        dryRun: options.dryRun
      });
    } catch (error) {
      console.error('💥 Refactor failed:', error);
      process.exit(1);
    }
  });

// Handle direct execution
if (require.main === module) {
  program.parse();
}

export { PayRoxRefactorCopilot, RefactorOptions, ValidationResult };
