import { Command } from 'commander';
import { ParsedContract, FacetCandidate } from '../../scripts/types/index';
export declare class SolidityAnalyzer {
    constructor();
    /**
     * Convert string to Uint8Array in a runtime-safe way (Node + browser)
     */
    private toBytes;
    /**
     * Keccak256 hash returning 0x-prefixed hex
     */
    private keccakHex;
    /**
     * Keccak256 (hex) using ethers to match Ethereum standards
     */
    private keccak256Hex;
    /**
     * Compute 4-byte selector from function signature
     */
    private selectorFromSignature;
    /**
     * Parse and analyze a Solidity contract
     */
    parseContract(sourceCode: string, contractName?: string): Promise<ParsedContract>;
    /**
     * Compile Solidity source code
     */
    private compileContract;
    /**
     * Find the main contract node in AST
     */
    private findContractNode;
    /**
     * Extract function information
     */
    private extractFunctions;
    /**
     * Extract state variables
     */
    private extractVariables;
    /**
     * Extract events
     */
    private extractEvents;
    /**
     * Extract modifiers
     */
    private extractModifiers;
    /**
     * Extract import statements
     */
    private extractImports;
    /**
     * Extract inheritance information
     */
    private extractInheritance;
    /**
     * Extract storage layout from compilation output
     */
    private extractStorageLayout;
    /**
     * Calculate function selector (4-byte hash)
     */
    private calculateSelector;
    /**
     * Build function signature string
     */
    private buildFunctionSignature;
    /**
     * Build event signature string
     */
    private buildEventSignature;
    /**
     * Extract parameters from parameter list
     */
    private extractParameters;
    /**
     * Extract function modifiers
     */
    private extractFunctionModifiers;
    /**
     * Convert type node to string representation
     */
    private typeToString;
    /**
     * Estimate contract bytecode size
     */
    private estimateContractSize;
    /**
     * Estimate function gas usage
     */
    private estimateFunctionGas;
    /**
     * Estimate function code size in bytes
     */
    private estimateFunctionSize;
    /**
     * Find function dependencies (other functions called)
     */
    private findFunctionDependencies;
    /**
     * Find variable dependencies
     */
    private findVariableDependencies;
    /**
     * Calculate variable storage size in bytes
     */
    private calculateVariableSize;
    /**
     * Calculate type size from storage layout
     */
    private calculateTypeSize;
    /**
     * Estimate gas usage for a code block
     */
    private estimateBlockGas;
    /**
     * Get source location information
     */
    private getSourceLocation;
    /**
     * Generic AST node visitor
     */
    private visitNode;
    /**
     * Identify facet candidates based on function grouping strategies
     */
    private identifyFacetCandidates;
    /**
     * Check if function is an admin function
     */
    private isAdminFunction;
    /**
     * Check if function is a governance function
     */
    private isGovernanceFunction;
    /**
     * Check if function is a core business logic function
     */
    private isCoreFunction;
    /**
     * Generate manifest routes for PayRox Go Beyond deployment
     */
    private generateManifestRoutes;
    /**
     * Assess security level of a function
     */
    private assessSecurityLevel;
    /**
     * Calculate runtime codehash for bytecode integrity verification
     */
    private calculateRuntimeCodehash;
    /**
     * Determine if contract requires chunking for DeterministicChunkFactory
     */
    private requiresChunking;
    /**
     * Detect storage layout collisions for facet isolation
     */
    private detectStorageCollisions;
    /**
     * Check if storage layout follows diamond storage patterns
     */
    private isDiamondStorageCompliant;
    /**
     * Determine optimal deployment strategy based on contract characteristics
     */
    private determineDeploymentStrategy;
    /**
     * Generate PayRox Go Beyond deployment manifest entry
     */
    generateManifestEntries(contract: ParsedContract): Record<string, unknown>[];
    /**
     * Generate facet-specific analysis report
     */
    generateFacetAnalysisReport(contract: ParsedContract): {
        facetRecommendations: FacetCandidate[];
        deploymentStrategy: string;
        gasOptimizations: string[];
        securityConsiderations: string[];
        chunkingStrategy?: string;
    };
    /**
     * Categorize facet by name
     */
    private categorizeFacet;
    /**
     * Analyze facet dependencies
     */
    private analyzeFacetDependencies;
    /**
     * Analyze facet storage requirements
     */
    private analyzeFacetStorage;
    /**
     * Generate gas optimization suggestions
     */
    private generateGasOptimizations;
    /**
     * Generate security considerations
     */
    private generateSecurityConsiderations;
    /**
     * Initialize CLI commands
     */
    initializeCLI(): Command;
    /**
     * Generate chunk plan for contract
     */
    private generateChunkPlan;
    /**
     * Plan and produce non-destructive refactor suggestions for a large contract.
     * This returns chunk plan plus suggested patch operations (dry-run) that
     * can be applied manually or reviewed by a developer/AI assistant.
     */
    refactorContract(sourceCode: string, options?: {
        maxChunkSize?: number;
        strategy?: 'function' | 'feature' | 'gas';
        dryRun?: boolean;
    }): Promise<{
        chunks: any[];
        patches: Array<{
            file: string;
            snippet: string;
        }>;
        summary: string;
    }>;
    /**
     * Calculate function complexity score
     */
    private calculateFunctionComplexity;
    /**
     * Plan chunks by individual functions (simple strategy)
     */
    private planChunksByFunction;
    /**
     * Plan chunks by gas usage optimization
     */
    private planChunksByGasUsage;
    /**
     * Plan chunks by feature grouping (advanced strategy)
     */
    private planChunksByFeature;
    /**
     * Group functions by detected features
     */
    private groupFunctionsByFeature;
    /**
     * Detect feature category for a function
     */
    private detectFunctionFeature;
    /**
     * Create empty chunk with proper initialization
     */
    private createEmptyChunk;
    /**
     * Calculate optimization metrics for chunk plan
     */
    private calculateChunkOptimization;
    /**
     * Calculate cross-chunk dependencies
     */
    private calculateCrossChunkDependencies;
    /**
     * Generate manifest for contract
     */
    private generateManifest;
    /**
     * Build manifest routes from analysis and chunk plan
     */
    private buildManifestRoutes;
    /**
     * Find function signature by name
     */
    private findFunctionSignature;
    /**
     * Calculate verification data for manifest
     */
    private calculateManifestVerification;
    /**
     * Calculate Keccak256 hash (Ethereum standard)
     */
    private calculateKeccak256;
    /**
     * Calculate merkle root from hashes
     */
    private calculateMerkleRoot;
    /**
     * Extract dependencies for manifest
     */
    private extractManifestDependencies;
    /**
     * Check security features for manifest
     */
    private checkManifestSecurity;
    /**
     * Calculate verification data for manifest
     */
    private calculateVerification;
    /**
     * Generate markdown report for contract analysis
     */
    private generateMarkdownReport;
    /**
     * Parse contract with lightweight mode for UI performance
     */
    parseContractLightweight(sourceCode: string, contractName?: string): Promise<ParsedContract>;
    /**
     * Estimate contract size without full compilation for UI performance
     */
    private estimateContractSizeLightweight;
    /**
       * Parse functions using regex for lightweight analysis
       * Based on the Deployment Analysis Route implementation
       */
    private parseFunctionsLightweight;
    /**
     * Parse parameter types from raw parameter string
     * Based on the Deployment Analysis Route implementation
     */
    private parseParamTypes;
    /**
     * Calculate selector from function signature
     * Based on the Deployment Analysis Route implementation
     */
    private calculateSelectorFromSignature;
    /**
     * Check if function is an admin function
     * Based on the Deployment Analysis Route implementation
     */
    private isAdminFunctionLightweight;
    /**
     * Parse contract with ultra-lightweight mode for maximum UI performance
     * Based on the Deployment Analysis Route implementation
     */
    parseContractUltraLightweight(sourceCode: string, contractName?: string): Promise<any>;
}
export default SolidityAnalyzer;
