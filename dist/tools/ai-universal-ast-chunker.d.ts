/**
 * 🤖 AI Universal AST Chunker & Deployment Optimizer (PayRox-Safe)
 *
 * Guarantees:
 * - Selectors computed via keccak256("name(types)") (ethers.Interface.getSighash)
 * - No loupe/165 leakage into generated facets (ERC-165 stays centralized)
 * - EIP-170 checks use runtime bytecode size
 * - Chunks use isolated namespaced storage libs
 * - Outputs DiamondCut + manifest stubs
 */
import { HardhatRuntimeEnvironment } from "hardhat/types";
interface ChunkAnalysis {
    originalFile: string;
    originalSize: number;
    originalRuntimeBytes: number;
    originalLines: number;
    recommendedChunks: ContractChunk[];
    gasEstimates: GasEstimate[];
    deploymentStrategy: DeploymentStrategy;
    diamondCut: DiamondCutData[];
    manifest: ManifestEntry[];
    validation: ValidationResult;
}
interface ContractChunk {
    name: string;
    type: "facet" | "library" | "interface" | "storage" | "init";
    content: string;
    size: number;
    runtimeBytes: number;
    estimatedGas: number;
    dependencies: string[];
    functions: FunctionInfo[];
    storageSlots: string[];
    interfaceId: string;
}
interface FunctionInfo {
    name: string;
    signature: string;
    selector: string;
    stateMutability: "pure" | "view" | "nonpayable" | "payable";
    inputs?: Array<{
        name: string;
        type: string;
    }>;
    outputs?: Array<{
        name: string;
        type: string;
    }>;
}
interface GasEstimate {
    chunkName: string;
    deploymentGas: number;
    functionGas: {
        [key: string]: number;
    };
    storageGas: number;
    isWithinLimit: boolean;
}
interface DeploymentStrategy {
    mainContract: string;
    facets: string[];
    libraries: string[];
    deploymentOrder: string[];
    crossReferences: {
        [key: string]: string[];
    };
}
interface DiamondCutData {
    facet: string;
    action: "Add" | "Replace" | "Remove";
    selectors: string[];
}
interface ManifestEntry {
    name: string;
    selectors: string[];
    signatures: string[];
    estimatedSize: number;
    securityLevel: string;
    versionTag: string;
}
interface ValidationResult {
    selectorParity: boolean;
    runtimeSizeOk: boolean;
    noLoupeInFacets: boolean;
    errors: string[];
    warnings: string[];
}
export declare class AIUniversalASTChunker {
    private hre;
    private maxRuntimeBytes;
    private maxGasLimit;
    private pragmaVersion;
    constructor(hre: HardhatRuntimeEnvironment);
    /**
     * Load ABI from artifacts and compute canonical selectors.
     */
    private loadAbi;
    private getRuntimeBytes;
    analyzeContract(filePath: string): Promise<ChunkAnalysis>;
    /**
     * Greedy pack by domains, keeping facets < EIP-170.
     */
    private generateOptimalChunks;
    private groupFunctionsByDomain;
    private packFunctionsIntoFacets;
    private mkFacetChunk;
    /**
     * IMPORTANT: Do NOT generate ERC-165 in facets (centralized per repo policy).
     */
    private generateFacetCode;
    /**
     * Generate a compilable stub with correct signature/visibility/mutability/returns.
     */
    private generateFunctionStub;
    private createStorageLibrary;
    private createInterfaceChunk;
    private createInitContract;
    private buildCutAndManifest;
    private validateChunks;
    private estimateGasCosts;
    private createDeploymentStrategy;
    private calculateInterfaceId;
    private estimateDeploymentGas;
    private extractDependencies;
    private createSingleChunkAnalysis;
    saveChunks(analysis: ChunkAnalysis, outputDir: string): Promise<void>;
    private generateDeploymentScript;
}
/**
 * CLI entry
 */
export declare function main(hre: HardhatRuntimeEnvironment): Promise<ChunkAnalysis[]>;
export type { ChunkAnalysis, ContractChunk, FunctionInfo, GasEstimate, DeploymentStrategy, DiamondCutData, ManifestEntry, ValidationResult, };
