import { parse } from '@solidity-parser/parser';
import * as solc from 'solc';
import { keccak256 } from 'ethers';
import * as crypto from 'crypto';
import { Command } from 'commander';
import * as fs from 'fs';
import * as _path from 'path';
import {
  ParsedContract,
  FunctionInfo,
  VariableInfo,
  EventInfo,
  ModifierInfo,
  ImportInfo,
  ParameterInfo,
  SourceLocation,
  StorageSlot,
  CompilationError,
  AnalysisError,
  ManifestRoute,
  FacetCandidate,
} from '../../scripts/types/index';

// Define AST node types to replace 'any'
interface ASTNode {
  type: string;
  name?: string;
  loc?: {
    start?: { line: number; column: number };
    end?: { line: number; column: number };
  };
  range?: [number, number];
  [key: string]: unknown;
}

interface ContractNode extends ASTNode {
  type: 'ContractDefinition';
  name: string;
  baseContracts?: Array<{
    baseName: { namePath: string };
  }>;
}

interface FunctionNode extends ASTNode {
  type: 'FunctionDefinition';
  name?: string;
  isConstructor?: boolean;
  visibility?: 'public' | 'external' | 'internal' | 'private';
  stateMutability?: 'pure' | 'view' | 'payable' | 'nonpayable';
  parameters?: ParameterListNode;
  returnParameters?: ParameterListNode;
  modifiers?: Array<{ name: string }>;
  body?: ASTNode;
}

interface ParameterListNode extends ASTNode {
  parameters?: Array<{
    name?: string;
    typeName: TypeNode;
    isIndexed?: boolean;
  }>;
}

interface TypeNode extends ASTNode {
  type: string;
  name?: string;
  namePath?: string;
  baseTypeName?: TypeNode;
  keyType?: TypeNode;
  valueType?: TypeNode;
  length?: string | number;
}

interface VariableNode extends ASTNode {
  name: string;
  typeName: TypeNode;
  visibility?: 'public' | 'internal' | 'private';
  isConstant?: boolean;
  isImmutable?: boolean;
  expression?: ASTNode;
}

interface EventNode extends ASTNode {
  type: 'EventDefinition';
  name: string;
  parameters?: ParameterListNode;
}

interface _ModifierNode extends ASTNode {
  type: 'ModifierDefinition';
  name: string;
  parameters?: ParameterListNode;
}

interface _ImportNode extends ASTNode {
  type: 'ImportDirective';
  path: string;
  symbolAliases?: Array<{ foreign: string }>;
}

interface _CompilationOutput {
  contracts?: {
    [filename: string]: {
      [contractName: string]: {
        abi?: unknown[];
        evm?: {
          bytecode?: { object?: string };
          deployedBytecode?: { object?: string };
          gasEstimates?: unknown;
        };
        storageLayout?: {
          storage?: Array<{
            slot: string;
            offset: number;
            type: string;
            label: string;
          }>;
          types?: Record<string, { numberOfBytes?: number }>;
        };
      };
    };
  };
  errors?: Array<{ severity: string; message: string }>;
}

// Canonical zero hash (256-bit)
const ZERO_HASH = '0x' + '0'.repeat(64);

export class SolidityAnalyzer {
  constructor() {
    // Parser and compiler are used directly
  }

  // --- Internal helpers -------------------------------------------------
  /**
   * Convert string to Uint8Array in a runtime-safe way (Node + browser)
   */
  private toBytes(s: string): Uint8Array {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(s);
    }
    // Fallback for older Node versions
    return Buffer.from(s, 'utf8');
  }

  /**
   * Keccak256 hash returning 0x-prefixed hex
   */
  private keccakHex(s: string | Uint8Array): string {
    try {
      if (typeof s === 'string') {
        return keccak256(this.toBytes(s));
      }
      return keccak256(s as Uint8Array);
    } catch (err) {
      // Fallback: return zero hash on failure
      return ZERO_HASH;
    }
  }

  /**
   * SHA256 (hex) using node crypto to match naming expectations
   */
  private sha256Hex(s: string): string {
    try {
      const hash = crypto.createHash('sha256').update(s, 'utf8').digest('hex');
      return '0x' + hash;
    } catch (err) {
      return ZERO_HASH;
    }
  }

  /**
   * Compute 4-byte selector from function signature
   */
  private selectorFromSignature(sig: string): string {
    if (!sig || typeof sig !== 'string') return '0x00000000';
    const hash = this.keccakHex(sig);
    return hash.slice(0, 10); // 0x + 8 hex chars
  }
  // ----------------------------------------------------------------------

  /**
   * Parse and analyze a Solidity contract
   */
  async parseContract(sourceCode: string, contractName?: string): Promise<ParsedContract> {
    try {
      // Parse the AST
      const ast = parse(sourceCode, {
        loc: true,
        range: true,
        tolerant: false,
      });

      // Compile to get additional metadata (best-effort)
      let compiled: Record<string, unknown> = {};
      try {
        compiled = await this.compileContract(sourceCode, contractName);
      } catch (e) {
        console.warn(
          'Compilation failed, continuing with AST-only analysis:',
          e instanceof Error ? e.message : e,
        );
        compiled = {};
      }

      // Extract contract information
      const contractNode = this.findContractNode(ast, contractName);
      if (!contractNode) {
        throw new AnalysisError('Contract not found in source code');
      }

      const functions = this.extractFunctions(contractNode, sourceCode);
      const variables = this.extractVariables(contractNode, sourceCode);
      const events = this.extractEvents(contractNode, sourceCode);
      const modifiers = this.extractModifiers(contractNode, sourceCode);
      const imports = this.extractImports(ast);
      const inheritance = this.extractInheritance(contractNode);
      const storageLayout = this.extractStorageLayout(compiled);
      const totalSize = this.estimateContractSize(compiled);

      // PayRox Go Beyond specific analysis
      const facetCandidates = this.identifyFacetCandidates(functions);
      const manifestRoutes = this.generateManifestRoutes(functions, compiled);
      const chunkingRequired = this.requiresChunking(totalSize);
      const runtimeCodehash = this.calculateRuntimeCodehash(compiled);
      const storageCollisions = this.detectStorageCollisions(variables);
      const deploymentStrategy = this.determineDeploymentStrategy(totalSize, functions.length);

      return {
        name: contractNode.name,
        sourceCode,
        ast,
        functions,
        variables,
        events,
        modifiers,
        imports,
        inheritance,
        totalSize,
        storageLayout,
        facetCandidates,
        manifestRoutes,
        chunkingRequired,
        runtimeCodehash,
        storageCollisions,
        deploymentStrategy,
      } as ParsedContract;
    } catch (error: unknown) {
      if (error instanceof AnalysisError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AnalysisError(`Failed to parse contract: ${errorMessage}`);
    }
  }

  /**
   * Compile Solidity source code
   */
  private async compileContract(
    sourceCode: string,
    _contractName?: string,
  ): Promise<Record<string, unknown>> {
    const input = {
      language: 'Solidity',
      sources: {
        'contract.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': [
              'abi',
              'evm.bytecode',
              'evm.deployedBytecode',
              'evm.gasEstimates',
              'storageLayout',
              'devdoc',
              'userdoc',
            ],
          },
        },
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    };

    try {
      const output = JSON.parse(solc.compile(JSON.stringify(input)));

      if (output.errors) {
        const errors = output.errors.filter(
          (err: { severity: string }) => err.severity === 'error',
        );
        if (errors.length > 0) {
          throw new CompilationError('Compilation failed', errors);
        }
      }

      return output;
    } catch (error: unknown) {
      if (error instanceof CompilationError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new CompilationError(`Compilation failed: ${errorMessage}`);
    }
  }

  /**
   * Find the main contract node in AST
   */
  private findContractNode(ast: unknown, contractName?: string): ContractNode | null {
    const contractNodes: ContractNode[] = [];

    this.visitNode(ast as ASTNode, (node) => {
      if (node.type === 'ContractDefinition') {
        contractNodes.push(node as ContractNode);
      }
    });

    if (contractName) {
      const found = contractNodes.find((node) => node.name === contractName);
      if (found) {
        return found;
      }
    }

    // Return the last contract (usually the main one)
    return contractNodes[contractNodes.length - 1] || null;
  }

  /**
   * Extract function information
   */
  private extractFunctions(contractNode: ContractNode, sourceCode: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    this.visitNode(contractNode, (node) => {
      if (node.type === 'FunctionDefinition') {
        const functionNode = node as FunctionNode;
        const functionInfo: FunctionInfo = {
          name: functionNode.name || (functionNode.isConstructor ? 'constructor' : 'fallback'),
          selector: this.calculateSelector(functionNode),
          signature: this.buildFunctionSignature(functionNode),
          visibility: functionNode.visibility || 'public',
          stateMutability: functionNode.stateMutability || 'nonpayable',
          parameters: this.extractParameters(functionNode.parameters),
          returnParameters: this.extractParameters(functionNode.returnParameters),
          modifiers: this.extractFunctionModifiers(functionNode),
          gasEstimate: this.estimateFunctionGas(functionNode),
          dependencies: this.findFunctionDependencies(functionNode, sourceCode),
          codeSize: this.estimateFunctionSize(functionNode, sourceCode),
          sourceLocation: this.getSourceLocation(functionNode, sourceCode),
        };

        functions.push(functionInfo);
      }
    });

    return functions;
  }

  /**
   * Extract state variables
   */
  private extractVariables(contractNode: ContractNode, sourceCode: string): VariableInfo[] {
    const variables: VariableInfo[] = [];
    let slotCounter = 0;

    this.visitNode(contractNode, (node) => {
      if (node.type === 'StateVariableDeclaration') {
        const variables_node = node as unknown as { variables: VariableNode[] };
        if (variables_node.variables) {
          for (const variable of variables_node.variables) {
            const variableInfo: VariableInfo = {
              name: variable.name,
              type: this.typeToString(variable.typeName),
              visibility: variable.visibility || 'internal',
              constant: variable.isConstant || false,
              immutable: variable.isImmutable || false,
              slot: slotCounter,
              offset: 0,
              size: this.calculateVariableSize(variable.typeName),
              dependencies: this.findVariableDependencies(variable, sourceCode),
              sourceLocation: this.getSourceLocation(variable, sourceCode),
            };

            // Update slot counter based on variable size (guarded)
            const varSize = variableInfo.size || 32;
            slotCounter += Math.ceil(varSize / 32);

            variables.push(variableInfo);
          }
        }
      }
    });

    return variables;
  }

  /**
   * Extract events
   */
  private extractEvents(contractNode: ContractNode, sourceCode: string): EventInfo[] {
    const events: EventInfo[] = [];

    this.visitNode(contractNode, (node) => {
      if (node.type === 'EventDefinition') {
        const eventInfo: EventInfo = {
          name: node.name || '',
          signature: this.buildEventSignature(node as unknown as EventNode),
          parameters: this.extractParameters(
            (node as any).parameters || {
              type: 'ParameterList',
              parameters: [],
            },
          ),
          indexed: (node as any).parameters?.map?.((param: any) => param.isIndexed || false) || [],
          sourceLocation: this.getSourceLocation(node, sourceCode),
        };

        events.push(eventInfo);
      }
    });

    return events;
  }

  /**
   * Extract modifiers
   */
  private extractModifiers(contractNode: any, sourceCode: string): ModifierInfo[] {
    const modifiers: ModifierInfo[] = [];

    this.visitNode(contractNode, (node) => {
      if (node.type === 'ModifierDefinition') {
        const modifierInfo: ModifierInfo = {
          name: node.name || '',
          parameters: this.extractParameters(
            (node as any).parameters || {
              type: 'ParameterList',
              parameters: [],
            },
          ),
          sourceLocation: this.getSourceLocation(node, sourceCode),
        };

        modifiers.push(modifierInfo);
      }
    });

    return modifiers;
  }

  /**
   * Extract import statements
   */
  private extractImports(ast: any): ImportInfo[] {
    const imports: ImportInfo[] = [];

    this.visitNode(ast, (node) => {
      if (node.type === 'ImportDirective') {
        const importInfo: ImportInfo = {
          path: (node as any).path || '',
          symbols: (node as any).symbolAliases?.map?.((alias: any) => alias.foreign) || [],
          sourceLocation: this.getSourceLocation(node, ''),
        };

        imports.push(importInfo);
      }
    });

    return imports;
  }

  /**
   * Extract inheritance information
   */
  private extractInheritance(contractNode: any): string[] {
    return contractNode.baseContracts?.map((base: any) => base.baseName.namePath) || [];
  }

  /**
   * Extract storage layout from compilation output
   */
  private extractStorageLayout(compiled: any): StorageSlot[] {
    const storageLayout: StorageSlot[] = [];

    try {
      const contracts = compiled.contracts?.['contract.sol'];
      if (!contracts) {
        return storageLayout;
      }

      for (const [contractName, contractData] of Object.entries(contracts)) {
        const layout = (contractData as any).storageLayout;
        if (layout?.storage) {
          for (const storage of layout.storage) {
            storageLayout.push({
              slot: parseInt(storage.slot),
              offset: storage.offset,
              size: this.calculateTypeSize(storage.type, layout.types),
              type: storage.type,
              variable: storage.label,
              contract: contractName,
            });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to extract storage layout:', error);
    }

    return storageLayout;
  }

  /**
   * Calculate function selector (4-byte hash)
   */
  private calculateSelector(functionNode: FunctionNode): string {
    if (!functionNode.name || functionNode.isConstructor) {
      return '0x00000000';
    }

    const signature = this.buildFunctionSignature(functionNode);
    return this.selectorFromSignature(signature);
  }

  /**
   * Build function signature string
   */
  private buildFunctionSignature(functionNode: FunctionNode): string {
    if (!functionNode.name || functionNode.isConstructor) {
      return 'constructor';
    }

    const params =
      functionNode.parameters?.parameters
        ?.map((param) => this.typeToString(param.typeName))
        .join(',') || '';

    return `${functionNode.name}(${params})`;
  }

  /**
   * Build event signature string
   */
  private buildEventSignature(eventNode: EventNode): string {
    const params =
      eventNode.parameters?.parameters
        ?.map((param) => this.typeToString(param.typeName))
        .join(',') || '';

    return `${eventNode.name}(${params})`;
  }

  /**
   * Extract parameters from parameter list
   */
  private extractParameters(parameterList: ParameterListNode | undefined): ParameterInfo[] {
    if (!parameterList?.parameters) {
      return [];
    }

    return parameterList.parameters.map((param) => ({
      name: param.name || '',
      type: this.typeToString(param.typeName),
      indexed: param.isIndexed || false,
    }));
  }

  /**
   * Extract function modifiers
   */
  private extractFunctionModifiers(functionNode: FunctionNode): string[] {
    return functionNode.modifiers?.map((modifier) => modifier.name) || [];
  }

  /**
   * Convert type node to string representation
   */
  private typeToString(typeNode: TypeNode): string {
    if (!typeNode) {
      return 'unknown';
    }

    switch (typeNode.type) {
      case 'ElementaryTypeName':
        return typeNode.name || 'unknown';
      case 'UserDefinedTypeName':
        return typeNode.namePath || 'unknown';
      case 'ArrayTypeName': {
        const baseType = typeNode.baseTypeName
          ? this.typeToString(typeNode.baseTypeName)
          : 'unknown';
        const length = typeNode.length ? `[${typeNode.length}]` : '[]';
        return `${baseType}${length}`;
      }
      case 'MappingTypeName': {
        const keyType = typeNode.keyType ? this.typeToString(typeNode.keyType) : 'unknown';
        const valueType = typeNode.valueType ? this.typeToString(typeNode.valueType) : 'unknown';
        return `mapping(${keyType} => ${valueType})`;
      }
      default:
        return typeNode.name || 'unknown';
    }
  }

  /**
   * Estimate contract bytecode size
   */
  private estimateContractSize(compiled: any): number {
    try {
      const contracts = compiled.contracts?.['contract.sol'];
      if (!contracts) {
        return 0;
      }

      let maxSize = 0;
      for (const [, contractData] of Object.entries(contracts)) {
        const bytecode = (contractData as any).evm?.deployedBytecode?.object;
        if (bytecode) {
          const size = Buffer.from(bytecode.replace('0x', ''), 'hex').length;
          maxSize = Math.max(maxSize, size);
        }
      }

      return maxSize;
    } catch (error) {
      console.warn('Failed to estimate contract size:', error);
      return 0;
    }
  }

  /**
   * Estimate function gas usage
   */
  private estimateFunctionGas(functionNode: any): number {
    // Basic estimation based on function complexity
    let gasEstimate = 21000; // Base transaction cost

    // Add gas for function complexity
    if (functionNode.body) {
      gasEstimate += this.estimateBlockGas(functionNode.body) * 1000;
    }

    // Add gas for modifiers
    gasEstimate += (functionNode.modifiers?.length || 0) * 5000;

    // Add gas for state mutability
    switch (functionNode.stateMutability) {
      case 'view':
      case 'pure':
        gasEstimate = Math.min(gasEstimate, 10000);
        break;
      case 'payable':
        gasEstimate += 10000;
        break;
    }

    return gasEstimate;
  }

  /**
   * Estimate function code size in bytes
   */
  private estimateFunctionSize(functionNode: any, sourceCode: string): number {
    if (!functionNode.body) {
      return 100; // Minimal function
    }

    const location = this.getSourceLocation(functionNode, sourceCode);
    // Ensure numeric slice indices for source slices
    const startIdx = typeof location.start === 'number' ? location.start : 0;
    const endIdx = typeof location.end === 'number' ? location.end : sourceCode.length;
    const functionCode = sourceCode.slice(startIdx, endIdx);

    // Rough estimation: 1 byte per 2 characters of source (accounting for compilation)
    return Math.ceil(functionCode.length / 2);
  }

  /**
   * Find function dependencies (other functions called)
   */
  private findFunctionDependencies(functionNode: any, _sourceCode: string): string[] {
    const dependencies: Set<string> = new Set();

    this.visitNode(functionNode, (node) => {
      if (node.type === 'FunctionCall' && node.name) {
        dependencies.add(node.name);
      }
      if (node.type === 'MemberAccess' && (node as any).memberName) {
        dependencies.add((node as any).memberName);
      }
    });

    return Array.from(dependencies);
  }

  /**
   * Find variable dependencies
   */
  private findVariableDependencies(variableNode: any, _sourceCode: string): string[] {
    const dependencies: Set<string> = new Set();

    if (variableNode.expression) {
      this.visitNode(variableNode.expression, (node) => {
        if (node.type === 'Identifier' && node.name) {
          dependencies.add(node.name);
        }
      });
    }

    return Array.from(dependencies);
  }

  /**
   * Calculate variable storage size in bytes
   */
  private calculateVariableSize(typeNode: any): number {
    const typeString = this.typeToString(typeNode);

    // Basic size mapping
    const sizeMap: Record<string, number> = {
      bool: 1,
      uint8: 1,
      uint16: 2,
      uint32: 4,
      uint64: 8,
      uint128: 16,
      uint256: 32,
      int8: 1,
      int16: 2,
      int32: 4,
      int64: 8,
      int128: 16,
      int256: 32,
      address: 20,
      bytes32: 32,
    };

    // Handle basic types
    if (sizeMap[typeString]) {
      return sizeMap[typeString];
    }

    // Handle dynamic types
    if (typeString.includes('[]') || typeString.startsWith('mapping')) {
      return 32; // Storage slot pointer
    }

    // Handle fixed-size arrays
    const arrayMatch = typeString.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch && arrayMatch[2]) {
      const baseSize = this.calculateVariableSize({
        type: 'ElementaryTypeName',
        name: arrayMatch[1],
      });
      const length = parseInt(arrayMatch[2]);
      return baseSize * length;
    }

    // Default to 32 bytes for unknown types
    return 32;
  }

  /**
   * Calculate type size from storage layout
   */
  private calculateTypeSize(type: string, types: any): number {
    const typeInfo = types[type];
    if (typeInfo) {
      return typeInfo.numberOfBytes || 32;
    }
    return 32;
  }

  /**
   * Estimate gas usage for a code block
   */
  private estimateBlockGas(blockNode: any): number {
    let gasEstimate = 0;

    this.visitNode(blockNode, (node) => {
      switch (node.type) {
        case 'AssignmentOperator':
          gasEstimate += 5; // SSTORE cost
          break;
        case 'FunctionCall':
          gasEstimate += 3; // CALL cost
          break;
        case 'IfStatement':
          gasEstimate += 1; // JUMPI cost
          break;
        case 'ForStatement':
        case 'WhileStatement':
          gasEstimate += 10; // Loop overhead
          break;
        default:
          gasEstimate += 0.1; // Basic operations
      }
    });

    return gasEstimate;
  }

  /**
   * Get source location information
   */
  private getSourceLocation(node: any, sourceCode: string): SourceLocation {
    if (node.loc) {
      return {
        // Preserve numeric range-based SourceLocation shape; attach optional line/column when available
        start: node.range?.[0] || 0,
        end: node.range?.[1] || 0,
        line: node.loc?.start?.line,
        column: node.loc?.start?.column,
      };
    }

    return {
      start: 0,
      end: sourceCode.length,
      line: 1,
      column: 1,
    };
  }

  /**
   * Generic AST node visitor
   */
  private visitNode(node: ASTNode, callback: (_node: ASTNode) => void): void {
    if (!node) {
      return;
    }

    callback(node);

    // Visit child nodes
    for (const [key, value] of Object.entries(node)) {
      if (Array.isArray(value)) {
        value.forEach((child) => {
          if (typeof child === 'object' && child !== null) {
            this.visitNode(child as ASTNode, callback);
          }
        });
      } else if (typeof value === 'object' && value !== null && key !== 'parent') {
        this.visitNode(value as ASTNode, callback);
      }
    }
  }

  // ===============================================
  // PayRox Go Beyond Specific Methods
  // ===============================================

  /**
   * Identify facet candidates based on function grouping strategies
   */
  private identifyFacetCandidates(functions: FunctionInfo[]): Map<string, FunctionInfo[]> {
    const facets = new Map<string, FunctionInfo[]>();

    for (const fn of functions) {
      let facetKey = 'UtilityFacet';

      // Categorize by function patterns and access levels
      if (this.isAdminFunction(fn)) {
        facetKey = 'AdminFacet';
      } else if (this.isGovernanceFunction(fn)) {
        facetKey = 'GovernanceFacet';
      } else if (fn.stateMutability === 'view' || fn.stateMutability === 'pure') {
        facetKey = 'ViewFacet';
      } else if (this.isCoreFunction(fn)) {
        facetKey = 'CoreFacet';
      }

      if (!facets.has(facetKey)) {
        facets.set(facetKey, []);
      }
      const facetFunctions = facets.get(facetKey);
      if (facetFunctions) {
        facetFunctions.push(fn);
      }
    }

    return facets;
  }

  /**
   * Check if function is an admin function
   */
  private isAdminFunction(func: FunctionInfo): boolean {
    const adminPatterns = [
      /^set[A-Z]/, // setX functions
      /^update[A-Z]/, // updateX functions
      /^change[A-Z]/, // changeX functions
      /^withdraw/, // withdraw functions
      /^pause/, // pause functions
      /^unpause/, // unpause functions
      /^emergency/, // emergency functions
      /^admin/, // admin functions
      /^owner/, // owner functions
      /^manage/, // management functions
      /^initialize/, // initialization
      /^configure/, // configuration
    ];

    return (
      adminPatterns.some((pattern) => pattern.test(func.name)) ||
      func.modifiers.some((mod) => /owner|admin|auth|role/i.test(mod))
    );
  }

  /**
   * Check if function is a governance function
   */
  private isGovernanceFunction(func: FunctionInfo): boolean {
    const governancePatterns = [
      /^propose/,
      /^vote/,
      /^execute/,
      /^delegate/,
      /^governance/,
      /^timelock/,
    ];

    return governancePatterns.some((pattern) => pattern.test(func.name));
  }

  /**
   * Check if function is a core business logic function
   */
  private isCoreFunction(func: FunctionInfo): boolean {
    // Functions that are not admin, governance, or view are considered core
    return (
      !this.isAdminFunction(func) &&
      !this.isGovernanceFunction(func) &&
      func.stateMutability !== 'view' &&
      func.stateMutability !== 'pure'
    );
  }

  /**
   * Generate manifest routes for PayRox Go Beyond deployment
   */
  private generateManifestRoutes(functions: FunctionInfo[], compiled: any): ManifestRoute[] {
    const routes: ManifestRoute[] = [];

    for (const func of functions) {
      // Skip constructor and fallback functions
      if (func.name === 'constructor' || func.name === 'fallback') {
        continue;
      }

      const route: ManifestRoute = {
        // include minimal required fields for ManifestRoute
        name: func.name,
        path: `/${func.name}`,
        selector: func.selector,
        facet: '<predicted_facet_address>', // Will be filled during deployment
        codehash: this.calculateRuntimeCodehash(compiled),
        functionName: func.name,
        gasEstimate: func.gasEstimate,
        securityLevel: this.assessSecurityLevel(func),
        // Optional fields for compatibility
        signature: func.signature,
        chunkId: undefined,
      } as ManifestRoute;

      routes.push(route);
    }

    return routes;
  }

  /**
   * Assess security level of a function
   */
  private assessSecurityLevel(func: FunctionInfo): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Admin functions, fund transfers
    if (
      this.isAdminFunction(func) ||
      func.name.includes('transfer') ||
      func.name.includes('withdraw')
    ) {
      return 'critical';
    }

    // High: State-changing functions with modifiers
    if (
      func.stateMutability !== 'view' &&
      func.stateMutability !== 'pure' &&
      (func.modifiers?.length || 0) > 0
    ) {
      return 'high';
    }

    // Medium: State-changing functions without modifiers
    if (func.stateMutability !== 'view' && func.stateMutability !== 'pure') {
      return 'medium';
    }

    // Low: View and pure functions
    return 'low';
  }

  /**
   * Calculate runtime codehash for bytecode integrity verification
   */
  private calculateRuntimeCodehash(compiled: any): string {
    try {
      const contracts = compiled.contracts?.['contract.sol'];
      if (!contracts) {
        return '0x0000000000000000000000000000000000000000000000000000000000000000';
      }

      // Get the first contract's deployed bytecode
      for (const [, contractData] of Object.entries(contracts)) {
        const deployedBytecode = (contractData as any).evm?.deployedBytecode?.object;
        if (deployedBytecode) {
          const cleanBytecode = deployedBytecode.startsWith('0x')
            ? deployedBytecode
            : `0x${deployedBytecode}`;
          return keccak256(cleanBytecode);
        }
      }

      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    } catch (error) {
      console.warn('Failed to calculate runtime codehash:', error);
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
  }

  /**
   * Determine if contract requires chunking for DeterministicChunkFactory
   */
  private requiresChunking(totalSize: number): boolean {
    const SAFE_CHUNK_LIMIT = 24000; // Safe limit below EIP-170 (24,576 bytes)
    return totalSize > SAFE_CHUNK_LIMIT;
  }

  /**
   * Detect storage layout collisions for facet isolation
   */
  private detectStorageCollisions(variables: VariableInfo[]): string[] {
    const slotMap = new Map<number, string[]>();
    const collisions: string[] = [];

    for (const variable of variables) {
      if (!slotMap.has(variable.slot)) {
        slotMap.set(variable.slot, []);
      }
      const slotVars = slotMap.get(variable.slot);
      if (slotVars) {
        slotVars.push(variable.name);
      }
    }

    // Check for collisions
    for (const [slot, vars] of Array.from(slotMap.entries())) {
      if (vars.length > 1) {
        collisions.push(`Potential storage collision at slot ${slot}: ${vars.join(', ')}`);
      }
    }

    // Check for diamond storage pattern compliance
    if (variables.length > 0 && !this.isDiamondStorageCompliant(variables)) {
      collisions.push(
        'Contract may not be diamond storage compliant - consider using diamond storage pattern',
      );
    }

    return collisions;
  }

  /**
   * Check if storage layout follows diamond storage patterns
   */
  private isDiamondStorageCompliant(variables: VariableInfo[]): boolean {
    // Look for diamond storage struct patterns
    const hasStorageStruct = variables.some(
      (v) => v.name.toLowerCase().includes('storage') || v.type.toLowerCase().includes('storage'),
    );

    // Check if variables are properly isolated
    const hasProperIsolation = variables.every((v) => v.slot >= 0 && v.offset >= 0);

    return hasStorageStruct && hasProperIsolation;
  }

  /**
   * Determine optimal deployment strategy based on contract characteristics
   */
  private determineDeploymentStrategy(
    totalSize: number,
    functionCount: number,
  ): 'single' | 'faceted' | 'chunked' {
    const SIZE_THRESHOLD = 20000; // Threshold for considering faceting
    const FUNCTION_THRESHOLD = 10; // Threshold for considering faceting
    const CHUNK_THRESHOLD = 24000; // Threshold for chunking

    if (totalSize > CHUNK_THRESHOLD) {
      return 'chunked';
    } else if (totalSize > SIZE_THRESHOLD || functionCount > FUNCTION_THRESHOLD) {
      return 'faceted';
    } else {
      return 'single';
    }
  }

  /**
   * Generate PayRox Go Beyond deployment manifest entry
   */
  generateManifestEntries(contract: ParsedContract): Record<string, unknown>[] {
    return (contract.functions || []).map((fn) => ({
      selector: fn.selector,
      facet: '<predicted_facet_address>',
      codehash: contract.runtimeCodehash || '<runtime_codehash>',
      functionName: fn.name,
      gasEstimate: fn.gasEstimate,
      securityLevel: this.assessSecurityLevel(fn),
    }));
  }

  /**
   * Generate facet-specific analysis report
   */
  generateFacetAnalysisReport(contract: ParsedContract): {
    facetRecommendations: FacetCandidate[];
    deploymentStrategy: string;
    gasOptimizations: string[];
    securityConsiderations: string[];
    chunkingStrategy?: string;
  } {
    const facetRecommendations: FacetCandidate[] = [];

    // Convert facet candidates to structured recommendations
    const facetEntries: Array<[string, any[]]> = contract.facetCandidates
      ? (Array.from((contract.facetCandidates as any).entries()) as Array<[string, any[]]>)
      : [];

    for (const [facetName, functions] of facetEntries) {
      const candidate: FacetCandidate = {
        name: facetName,
        functions: functions,
        estimatedSize: functions.reduce((total, fn) => total + fn.codeSize, 0),
        category: this.categorizeFacet(facetName),
        dependencies: this.analyzeFacetDependencies(functions),
        storageRequirements: this.analyzeFacetStorage(functions),
      };

      facetRecommendations.push(candidate);
    }

    const gasOptimizations = this.generateGasOptimizations(contract);
    const securityConsiderations = this.generateSecurityConsiderations(contract);

    return {
      facetRecommendations,
      deploymentStrategy: contract.deploymentStrategy,
      gasOptimizations,
      securityConsiderations,
      ...(contract.chunkingRequired && {
        chunkingStrategy: 'DeterministicChunkFactory staging required',
      }),
    };
  }

  /**
   * Categorize facet by name
   */
  private categorizeFacet(facetName: string): 'admin' | 'governance' | 'view' | 'utility' | 'core' {
    const name = facetName.toLowerCase();
    if (name.includes('admin')) {
      return 'admin';
    }
    if (name.includes('governance')) {
      return 'governance';
    }
    if (name.includes('view')) {
      return 'view';
    }
    if (name.includes('core')) {
      return 'core';
    }
    return 'utility';
  }

  /**
   * Analyze facet dependencies
   */
  private analyzeFacetDependencies(functions: FunctionInfo[]): string[] {
    const dependencies = new Set<string>();

    for (const func of functions) {
      for (const dep of func.dependencies) {
        dependencies.add(dep);
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Analyze facet storage requirements
   */
  private analyzeFacetStorage(_functions: FunctionInfo[]): string[] {
    // This would analyze which storage variables are accessed by facet functions
    // For now, return a placeholder
    return ['Isolated diamond storage required'];
  }

  /**
   * Generate gas optimization suggestions
   */
  private generateGasOptimizations(contract: ParsedContract): string[] {
    const optimizations: string[] = [];

    if (contract.chunkingRequired) {
      optimizations.push('Deploy via DeterministicChunkFactory to avoid contract size limits');
    }

    if (contract.facetCandidates.size > 1) {
      optimizations.push('Modular facet deployment reduces individual deployment costs');
    }

    if (contract.storageCollisions.length > 0) {
      optimizations.push('Implement diamond storage pattern to avoid storage collisions');
    }

    const viewFunctions = contract.functions.filter(
      (f) => f.stateMutability === 'view' || f.stateMutability === 'pure',
    );
    if (viewFunctions.length > 5) {
      optimizations.push('Consider separate ViewFacet for read-only operations');
    }

    return optimizations;
  }

  /**
   * Generate security considerations
   */
  private generateSecurityConsiderations(contract: ParsedContract): string[] {
    const considerations: string[] = [];

    const criticalFunctions = contract.functions.filter(
      (f) => this.assessSecurityLevel(f) === 'critical',
    );

    if (criticalFunctions.length > 0) {
      considerations.push(
        `${criticalFunctions.length} critical functions require enhanced access control`,
      );
    }

    if (contract.storageCollisions.length > 0) {
      considerations.push('Storage collisions detected - implement proper facet isolation');
    }

    const adminFunctions = contract.functions.filter((f) => this.isAdminFunction(f));
    if (adminFunctions.length > 0) {
      considerations.push('Separate AdminFacet recommended for privileged functions');
    }

    if (contract.deploymentStrategy === 'chunked') {
      considerations.push('Chunked deployment requires additional integrity verification');
    }

    return considerations;
  }

  /**
   * Initialize CLI commands
   */
  initializeCLI(): Command {
    const program = new Command();

    program
      .name('solidity-analyzer')
      .description('PayRox Go Beyond Solidity Analyzer')
      .version('1.0.0');

    program
      .command('analyze')
      .description('Analyze a Solidity contract')
      .argument('<contractPath>', 'Path to the Solidity contract file')
      .option('-o, --output <file>', 'Output file for analysis results', 'analysis.json')
      .option('-v, --verbose', 'Verbose output')
      .option('--contract-name <name>', 'Specific contract name to analyze')
      .action(
        async (
          contractPath: string,
          options: { output: string; verbose?: boolean; contractName?: string },
        ) => {
          try {
            console.log(`Analyzing contract: ${contractPath}`);

            // Check if file exists
            if (!fs.existsSync(contractPath)) {
              console.error(`Error: Contract file not found at ${contractPath}`);
              process.exit(1);
            }

            // Read contract source
            const sourceCode = fs.readFileSync(contractPath, 'utf8');

            // Analyze contract
            const analysis = await this.parseContract(sourceCode, options.contractName);

            if (options.verbose) {
              console.log('Analysis Results:');
              console.log(`- Contract name: ${analysis.name}`);
              console.log(`- Functions found: ${analysis.functions.length}`);
              console.log(`- State variables: ${analysis.variables.length}`);
              console.log(`- Events: ${analysis.events.length}`);
              console.log(`- Modifiers: ${analysis.modifiers.length}`);
              console.log(`- Total size: ${analysis.totalSize} bytes`);
              console.log(`- Deployment strategy: ${analysis.deploymentStrategy}`);
              console.log(`- Chunking required: ${analysis.chunkingRequired}`);
            }

            // Write output
            fs.writeFileSync(options.output, JSON.stringify(analysis, null, 2));
            console.log(`Analysis saved to: ${options.output}`);
          } catch (error) {
            console.error(
              'Analysis failed:',
              error instanceof Error ? error.message : 'Unknown error',
            );
            process.exit(1);
          }
        },
      );

    program
      .command('refactor')
      .description('Plan a non-destructive refactor for a solidity file (dry-run)')
      .argument('<file>', 'solidity file to plan refactor for')
      .option('-m, --maxChunkSize <n>', 'maximum chunk size', '24576')
      .option('-s, --strategy <strategy>', "strategy: 'function' | 'feature' | 'gas'", 'function')
      .action(async (file, opts) => {
        const src = fs.readFileSync(file, 'utf8');
        const result = await this.refactorContract(src, {
          maxChunkSize: Number(opts.maxChunkSize),
          strategy: opts.strategy,
        });
        console.log(JSON.stringify(result, null, 2));
      });

    program
      .command('chunk')
      .description('Plan optimal chunking strategy for a contract')
      .argument('<contractPath>', 'Path to the Solidity contract file')
      .option('-s, --max-size <bytes>', 'Maximum chunk size in bytes', '24576')
      .option('-o, --output <file>', 'Output file for chunk plan', 'chunk-plan.json')
      .option('--strategy <type>', 'Chunking strategy (function|feature|gas)', 'function')
      .option('-g, --gas-limit <gas>', 'Maximum gas limit for gas-based chunking')
      .option('--contract-name <name>', 'Specific contract name to analyze')
      .action(
        async (
          contractPath: string,
          options: {
            maxSize: string;
            output: string;
            strategy: 'function' | 'feature' | 'gas';
            gasLimit?: string;
            contractName?: string;
          },
        ) => {
          try {
            console.log(`Planning chunks for: ${contractPath}`);

            // Check if file exists
            if (!fs.existsSync(contractPath)) {
              console.error(`Error: Contract file not found at ${contractPath}`);
              process.exit(1);
            }

            // Read contract source
            const sourceCode = fs.readFileSync(contractPath, 'utf8');

            // Analyze contract
            const analysis = await this.parseContract(sourceCode, options.contractName);

            // Generate chunk plan using our enhanced logic
            const chunkPlan = this.generateChunkPlan(analysis, {
              maxChunkSize: parseInt(options.maxSize),
              strategy: options.strategy,
              gasLimit: options.gasLimit ? parseInt(options.gasLimit) : undefined,
            });

            console.log(`Generated ${chunkPlan.chunks.length} chunks:`);
            console.log(`Strategy: ${chunkPlan.strategy}`);
            console.log(`Total functions: ${chunkPlan.totalFunctions}`);
            console.log(`Total estimated size: ${chunkPlan.totalEstimatedSize} bytes`);

            if (chunkPlan.optimization) {
              console.log(`Optimization efficiency: ${chunkPlan.optimization.efficiency}`);
              console.log(`Gas optimized: ${chunkPlan.optimization.gasOptimized}`);
              console.log(`Dependency score: ${chunkPlan.optimization.dependencyScore}`);

              if (chunkPlan.optimization.recommendations.length > 0) {
                console.log('Recommendations:');
                chunkPlan.optimization.recommendations.forEach((rec: string) => {
                  console.log(`  - ${rec}`);
                });
              }
            }

            chunkPlan.chunks.forEach((chunk: any, i: number) => {
              console.log(
                `  Chunk ${i + 1} (${chunk.id}): ${chunk.functions.length} functions, ~${
                  chunk.estimatedSize
                } bytes, ${chunk.gasEstimate} gas`,
              );
            });

            fs.writeFileSync(options.output, JSON.stringify(chunkPlan, null, 2));
            console.log(`Chunk plan saved to: ${options.output}`);
          } catch (error) {
            console.error(
              'Chunking failed:',
              error instanceof Error ? error.message : 'Unknown error',
            );
            process.exit(1);
          }
        },
      );

    program
      .command('manifest')
      .description('Build complete deployment manifest')
      .argument('<contractPath>', 'Path to the Solidity contract file')
      .option('-o, --output <file>', 'Output manifest file', 'deployment.manifest.json')
      .option('--network <name>', 'Target network', 'hardhat')
      .option('--factory <address>', 'Factory contract address')
      .option('--dispatcher <address>', 'Dispatcher contract address')
      .option('--contract-name <name>', 'Specific contract name to analyze')
      .action(
        async (
          contractPath: string,
          options: {
            output: string;
            network: string;
            factory?: string;
            dispatcher?: string;
            contractName?: string;
          },
        ) => {
          try {
            console.log(`Building manifest for: ${contractPath}`);

            // Check if file exists
            if (!fs.existsSync(contractPath)) {
              console.error(`Error: Contract file not found at ${contractPath}`);
              process.exit(1);
            }

            // Read contract source
            const sourceCode = fs.readFileSync(contractPath, 'utf8');

            // Analyze contract
            const analysis = await this.parseContract(sourceCode, options.contractName);

            // Generate manifest using our existing logic
            const manifest = this.generateManifest(analysis, {
              network: options.network,
              factory: options.factory,
              dispatcher: options.dispatcher,
            });

            fs.writeFileSync(options.output, JSON.stringify(manifest, null, 2));
            console.log(`Manifest saved to: ${options.output}`);
            console.log(`Manifest contains ${manifest.routes.length} routes`);
          } catch (error) {
            console.error(
              'Manifest building failed:',
              error instanceof Error ? error.message : 'Unknown error',
            );
            process.exit(1);
          }
        },
      );

    program
      .command('report')
      .description('Generate comprehensive analysis report')
      .argument('<contractPath>', 'Path to the Solidity contract file')
      .option('-o, --output <file>', 'Output report file', 'report.md')
      .option('--format <type>', 'Report format (markdown|json)', 'markdown')
      .option('--contract-name <name>', 'Specific contract name to analyze')
      .action(
        async (
          contractPath: string,
          options: {
            output: string;
            format: 'markdown' | 'json';
            contractName?: string;
          },
        ) => {
          try {
            console.log(`Generating report for: ${contractPath}`);

            // Check if file exists
            if (!fs.existsSync(contractPath)) {
              console.error(`Error: Contract file not found at ${contractPath}`);
              process.exit(1);
            }

            // Read contract source
            const sourceCode = fs.readFileSync(contractPath, 'utf8');

            // Analyze contract
            const analysis = await this.parseContract(sourceCode, options.contractName);

            // Generate report
            let report: string;
            switch (options.format) {
              case 'json':
                report = JSON.stringify(analysis, null, 2);
                break;
              case 'markdown':
              default:
                report = this.generateMarkdownReport(analysis);
                break;
            }

            fs.writeFileSync(options.output, report);
            console.log(`Report saved to: ${options.output}`);
          } catch (error) {
            console.error(
              'Report generation failed:',
              error instanceof Error ? error.message : 'Unknown error',
            );
            process.exit(1);
          }
        },
      );

    return program;
  }

  /**
   * Generate chunk plan for contract
   */
  private generateChunkPlan(
    analysis: ParsedContract,
    options: { maxChunkSize: number; strategy: string; gasLimit?: number },
  ): any {
    // Convert analysis functions to chunk functions
    const chunkFunctions = analysis.functions.map((func) => ({
      name: func.name,
      signature: func.signature,
      estimatedSize: func.codeSize,
      gasEstimate: func.gasEstimate,
      complexity: this.calculateFunctionComplexity(func),
      dependencies: func.dependencies,
    }));

    let chunks: any[] = [];

    // Group functions based on strategy
    switch (options.strategy) {
      case 'feature':
        chunks = this.planChunksByFeature(chunkFunctions, options.maxChunkSize);
        break;

      case 'gas':
        chunks = this.planChunksByGasUsage(chunkFunctions, options.maxChunkSize, options.gasLimit);
        break;

      case 'function':
      default:
        chunks = this.planChunksByFunction(chunkFunctions, options.maxChunkSize);
        break;
    }

    // Calculate optimization metrics
    const optimization = this.calculateChunkOptimization(chunks, options);

    return {
      chunks,
      totalFunctions: analysis.functions.length,
      totalEstimatedSize: chunks.reduce((sum, chunk) => sum + chunk.estimatedSize, 0),
      strategy: options.strategy,
      optimization,
    };
  }

  /**
   * Plan and produce non-destructive refactor suggestions for a large contract.
   * This returns chunk plan plus suggested patch operations (dry-run) that
   * can be applied manually or reviewed by a developer/AI assistant.
   */
  async refactorContract(
    sourceCode: string,
    options: {
      maxChunkSize?: number;
      strategy?: 'function' | 'feature' | 'gas';
      dryRun?: boolean;
    } = {},
  ): Promise<{
    chunks: any[];
    patches: Array<{ file: string; snippet: string }>;
    summary: string;
  }> {
    // Lightweight parse to avoid expensive compilation during refactor planning
    const analysis = await this.parseContractLightweight(sourceCode);

    const chunkPlan = this.generateChunkPlan(analysis as ParsedContract, {
      maxChunkSize: options.maxChunkSize || 24576,
      strategy: options.strategy || 'function',
    });

    // Create human-reviewable patches (suggested new facet files per chunk)
    const patches: Array<{ file: string; snippet: string }> = [];

    for (const chunk of chunkPlan.chunks) {
      const fileName = `${analysis.name || 'Contract'}-${chunk.id}.facet.sol`;
      // Heuristic snippet: export minimal interface with function signatures
      const funcs = chunk.functions
        .map((f: any) => `function ${f.name}(${f.signature || ''}) external;`)
        .join('\n');
      const snippet = `// Suggested facet: ${chunk.id}\n// Functions:\n${funcs}\n`;
      patches.push({ file: fileName, snippet });
    }

    const summary = `Refactor plan: ${chunkPlan.chunks.length} chunks suggested; ${patches.length} facet stubs prepared.`;

    return { chunks: chunkPlan.chunks, patches, summary };
  }

  /**
   * Calculate function complexity score
   */
  private calculateFunctionComplexity(func: FunctionInfo): number {
    let complexity = 1; // Base complexity

    // Add complexity for parameters
    complexity += func.parameters.length * 0.5;

    // Add complexity for return parameters
    complexity += func.returnParameters.length * 0.5;

    // Add complexity for modifiers
    complexity += func.modifiers.length;

    // Add complexity for state mutability
    if (func.stateMutability !== 'view' && func.stateMutability !== 'pure') {
      complexity += 1;
    }

    // Add complexity for dependencies
    complexity += func.dependencies.length * 0.2;

    return Math.round(complexity * 10) / 10;
  }

  /**
   * Plan chunks by individual functions (simple strategy)
   */
  private planChunksByFunction(functions: any[], maxChunkSize: number): any[] {
    const chunks: any[] = [];
    let currentChunk: any = this.createEmptyChunk(chunks.length);

    for (const func of functions) {
      // Check if adding this function would exceed size limit
      if (currentChunk.estimatedSize + func.estimatedSize > maxChunkSize) {
        if (currentChunk.functions.length > 0) {
          chunks.push(currentChunk);
          currentChunk = this.createEmptyChunk(chunks.length);
        }
      }

      currentChunk.functions.push(func);
      currentChunk.estimatedSize += func.estimatedSize;
      currentChunk.gasEstimate += func.gasEstimate;
      currentChunk.dependencies.push(...func.dependencies);
    }

    if (currentChunk.functions.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Plan chunks by gas usage optimization
   */
  private planChunksByGasUsage(functions: any[], maxChunkSize: number, gasLimit?: number): any[] {
    // Sort functions by gas usage (ascending)
    const sortedFunctions = [...functions].sort((a, b) => a.gasEstimate - b.gasEstimate);

    const chunks: any[] = [];
    let currentChunk: any = this.createEmptyChunk(chunks.length);

    for (const func of sortedFunctions) {
      // Check both size and gas limits
      if (
        currentChunk.estimatedSize + func.estimatedSize > maxChunkSize ||
        (gasLimit && currentChunk.gasEstimate + func.gasEstimate > gasLimit)
      ) {
        if (currentChunk.functions.length > 0) {
          chunks.push(currentChunk);
          currentChunk = this.createEmptyChunk(chunks.length);
        }
      }

      currentChunk.functions.push(func);
      currentChunk.estimatedSize += func.estimatedSize;
      currentChunk.gasEstimate += func.gasEstimate;
      currentChunk.dependencies.push(...func.dependencies);
    }

    if (currentChunk.functions.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Plan chunks by feature grouping (advanced strategy)
   */
  private planChunksByFeature(functions: any[], maxChunkSize: number): any[] {
    const featureGroups = this.groupFunctionsByFeature(functions);
    const chunks: any[] = [];

    for (const [feature, funcs] of featureGroups) {
      let currentChunk: any = this.createEmptyChunk(chunks.length, feature);

      for (const func of funcs) {
        if (currentChunk.estimatedSize + func.estimatedSize > maxChunkSize) {
          if (currentChunk.functions.length > 0) {
            chunks.push(currentChunk);
            currentChunk = this.createEmptyChunk(chunks.length, feature);
          }
        }

        currentChunk.functions.push(func);
        currentChunk.estimatedSize += func.estimatedSize;
        currentChunk.gasEstimate += func.gasEstimate;
        currentChunk.dependencies.push(...func.dependencies);
      }

      if (currentChunk.functions.length > 0) {
        chunks.push(currentChunk);
      }
    }

    return chunks;
  }

  /**
   * Group functions by detected features
   */
  private groupFunctionsByFeature(functions: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const func of functions) {
      const feature = this.detectFunctionFeature(func);

      if (!groups.has(feature)) {
        groups.set(feature, []);
      }

      const group = groups.get(feature);
      if (group) {
        group.push(func);
      }
    }

    return groups;
  }

  /**
   * Detect feature category for a function
   */
  private detectFunctionFeature(func: any): string {
    const name = func.name.toLowerCase();

    // ERC20-like functions
    if (
      ['transfer', 'approve', 'allowance', 'balanceof', 'totalsupply'].some((pattern) =>
        name.includes(pattern),
      )
    ) {
      return 'erc20';
    }

    // Access control functions
    if (
      ['onlyowner', 'onlyadmin', 'onlyauthorized', 'require'].some((pattern) =>
        name.includes(pattern),
      ) ||
      func.name.includes('Role')
    ) {
      return 'access-control';
    }

    // View/pure functions
    if (func.gasEstimate < 10000) {
      return 'read-only';
    }

    // Administrative functions
    if (
      ['mint', 'burn', 'pause', 'unpause', 'withdraw', 'emergency'].some((pattern) =>
        name.includes(pattern),
      )
    ) {
      return 'administrative';
    }

    return 'core';
  }

  /**
   * Create empty chunk with proper initialization
   */
  private createEmptyChunk(index: number, feature?: string): any {
    const id = feature ? `${feature}-${index}` : `chunk-${index}`;
    return {
      id,
      functions: [],
      estimatedSize: 0,
      gasEstimate: 0,
      dependencies: [],
    };
  }

  /**
   * Calculate optimization metrics for chunk plan
   */
  private calculateChunkOptimization(
    chunks: any[],
    options: { maxChunkSize: number; gasLimit?: number },
  ): any {
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.estimatedSize, 0);
    const averageChunkSize = totalSize / chunks.length;
    const sizeEfficiency = averageChunkSize / options.maxChunkSize;

    const totalGas = chunks.reduce((sum, chunk) => sum + chunk.gasEstimate, 0);
    const gasOptimized = options.gasLimit ? totalGas <= options.gasLimit : true;

    // Calculate dependency score (lower is better)
    const crossChunkDependencies = this.calculateCrossChunkDependencies(chunks);
    const dependencyScore = crossChunkDependencies / Math.max(chunks.length - 1, 1);

    const recommendations: string[] = [];

    if (sizeEfficiency < 0.7) {
      recommendations.push('Consider merging smaller chunks for better size efficiency');
    }

    if (!gasOptimized) {
      recommendations.push('Gas usage exceeds recommended limits - consider function optimization');
    }

    if (dependencyScore > 0.3) {
      recommendations.push(
        'High cross-chunk dependencies detected - consider reorganizing features',
      );
    }

    if (chunks.length > 10) {
      recommendations.push('Large number of chunks may increase deployment complexity');
    }

    return {
      efficiency: Math.round(sizeEfficiency * 100) / 100,
      gasOptimized,
      dependencyScore: Math.round(dependencyScore * 100) / 100,
      recommendations,
    };
  }

  /**
   * Calculate cross-chunk dependencies
   */
  private calculateCrossChunkDependencies(chunks: any[]): number {
    // Simplified dependency calculation
    // In practice, this would analyze actual function call relationships
    let crossDependencies = 0;

    for (let i = 0; i < chunks.length; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        const chunk1Deps = new Set(chunks[i].dependencies);
        const chunk2Funcs = new Set(chunks[j].functions.map((f: any) => f.name));

        // Count dependencies from chunk1 to chunk2
        for (const dep of chunk1Deps) {
          if (chunk2Funcs.has(dep)) {
            crossDependencies++;
          }
        }
      }
    }

    return crossDependencies;
  }

  /**
   * Generate manifest for contract
   */
  private generateManifest(
    analysis: ParsedContract,
    options: { network: string; factory?: string; dispatcher?: string; deployer?: string },
  ): any {
    // Generate chunk plan for the manifest
    const chunkPlan = this.generateChunkPlan(analysis, {
      maxChunkSize: 24576, // EIP-170 limit
      strategy: 'function',
    });

    // Build routes from analysis and chunk plan
    const routes = this.buildManifestRoutes(analysis, chunkPlan);

    // Calculate verification data
    const verification = this.calculateManifestVerification(chunkPlan.chunks, routes);

    // Extract dependencies
    const dependencies = this.extractManifestDependencies(analysis);

    // Check security features
    const security = this.checkManifestSecurity(analysis);

    return {
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        network: options.network,
        creator: 'SolidityAnalyzer',
      },
      target: {
        factory: options.factory,
        dispatcher: options.dispatcher,
        deployer: options.deployer,
      },
      chunks: chunkPlan.chunks,
      routes,
      verification,
      dependencies,
      security,
    };
  }

  /**
   * Build manifest routes from analysis and chunk plan
   */
  private buildManifestRoutes(analysis: ParsedContract, chunkPlan: any): any[] {
    const routes: any[] = [];

    // Create a map of function names to chunk IDs
    const functionToChunkMap = new Map<string, string>();
    chunkPlan.chunks.forEach((chunk: any) => {
      chunk.functions.forEach((func: any) => {
        functionToChunkMap.set(func.name, chunk.id);
      });
    });

    // Build routes from manifest routes in analysis
    analysis.manifestRoutes.forEach((route) => {
      const funcName = route.functionName || '';
      const chunkId = functionToChunkMap.get(funcName) || 'unknown-chunk';
      routes.push({
        selector: route.selector,
        signature: this.findFunctionSignature(analysis.functions, funcName),
        chunkId,
        functionName: funcName,
        // In a real implementation, we would calculate actual facet addresses
        facet: '<predicted_facet_address>',
      });
    });

    return routes;
  }

  /**
   * Find function signature by name
   */
  private findFunctionSignature(functions: FunctionInfo[], functionName: string): string {
    const func = functions.find((f) => f.name === functionName);
    return func ? func.signature : '';
  }

  /**
   * Calculate verification data for manifest
   */
  private calculateManifestVerification(chunks: any[], routes: any[]): any {
    const chunkHashes: { [chunkId: string]: string } = {};
    let totalSize = 0;

    // Calculate hash for each chunk
    chunks.forEach((chunk) => {
      const chunkData = JSON.stringify({
        id: chunk.id,
        functions: chunk.functions.map((f: any) => f.name).sort(),
        estimatedSize: chunk.estimatedSize,
      });
      chunkHashes[chunk.id] = this.calculateSHA256(chunkData);
      totalSize += chunk.estimatedSize;
    });

    // Calculate merkle root from chunk hashes
    const sortedHashes = Object.values(chunkHashes).sort();
    const merkleRoot = this.calculateMerkleRoot(sortedHashes);

    return {
      merkleRoot,
      chunkHashes,
      routeCount: routes.length,
      totalSize,
    };
  }

  /**
   * Calculate SHA256 hash
   */
  private calculateSHA256(data: string): string {
    // Use real SHA256 (node crypto) and return 0x-prefixed hex
    return this.sha256Hex(data);
  }

  /**
   * Calculate merkle root from hashes
   */
  private calculateMerkleRoot(hashes: string[]): string {
    if (!hashes || hashes.length === 0) {
      return ZERO_HASH;
    }
    if (hashes.length === 1) {
      return hashes[0] || ZERO_HASH;
    }

    const nextLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left; // Duplicate last hash if odd number
      // combine raw hex strings; strip 0x if present
      const leftRaw = left.startsWith('0x') ? left.slice(2) : left;
      const rightRaw = right.startsWith('0x') ? right.slice(2) : right;
      const combined = this.calculateSHA256(leftRaw + rightRaw);
      nextLevel.push(combined);
    }

    return this.calculateMerkleRoot(nextLevel);
  }

  /**
   * Extract dependencies for manifest
   */
  private extractManifestDependencies(analysis: ParsedContract): string[] {
    const dependencies: string[] = [];

    // Extract from imports
    analysis.imports.forEach((imp) => {
      if (imp.path.startsWith('@openzeppelin') || imp.path.startsWith('@')) {
        dependencies.push(imp.path);
      }
    });

    // Extract from inheritance
    analysis.inheritance.forEach((inh) => {
      dependencies.push(inh);
    });

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Check security features for manifest
   */
  private checkManifestSecurity(analysis: ParsedContract): any {
    return {
      pausable: analysis.functions.some(
        (func) => func.name === 'pause' || func.name === 'unpause' || func.name === 'paused',
      ),
      upgradeable: true, // Assume upgradeable in PayRox context
    };
  }

  /**
   * Calculate verification data for manifest
   */
  private calculateVerification(analysis: ParsedContract, routes: any[]): any {
    // This is a simplified version - in a real implementation, this would be more complex
    return {
      merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
      routeCount: routes.length,
      totalSize: analysis.totalSize,
    };
  }

  /**
   * Generate markdown report for contract analysis
   */
  private generateMarkdownReport(analysis: ParsedContract): string {
    let report = `# Contract Analysis Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += `## Overview\n`;
    report += `- Contract Name: ${analysis.name}\n`;
    report += `- Functions: ${analysis.functions.length}\n`;
    report += `- State Variables: ${analysis.variables.length}\n`;
    report += `- Events: ${analysis.events.length}\n`;
    report += `- Modifiers: ${analysis.modifiers.length}\n`;
    report += `- Total Size: ${analysis.totalSize} bytes\n`;
    report += `- Deployment Strategy: ${analysis.deploymentStrategy}\n`;
    report += `- Chunking Required: ${analysis.chunkingRequired}\n\n`;

    report += `## Functions\n`;
    analysis.functions.forEach((func) => {
      report += `- **${func.name}** (${func.visibility} ${func.stateMutability})\n`;
      report += `  - Selector: ${func.selector}\n`;
      report += `  - Signature: ${func.signature}\n`;
      report += `  - Gas Estimate: ${func.gasEstimate}\n`;
      report += `  - Code Size: ${func.codeSize} bytes\n\n`;
    });

    report += `## State Variables\n`;
    analysis.variables.forEach((variable) => {
      report += `- **${variable.name}** (${variable.type})\n`;
      report += `  - Visibility: ${variable.visibility}\n`;
      report += `  - Slot: ${variable.slot}\n`;
      report += `  - Size: ${variable.size} bytes\n\n`;
    });

    report += `## Facet Recommendations\n`;
    const facetEntriesReport: Array<[string, any[]]> = analysis.facetCandidates
      ? (Array.from((analysis.facetCandidates as any).entries()) as Array<[string, any[]]>)
      : [];

    for (const [facetName, functions] of facetEntriesReport) {
      report += `- **${facetName}**: ${functions.length} functions\n`;
    }

    return report;
  }

  /**
   * Parse contract with lightweight mode for UI performance
   */
  async parseContractLightweight(
    sourceCode: string,
    contractName?: string,
  ): Promise<ParsedContract> {
    try {
      // Parse the AST with tolerant mode for better performance
      const ast = parse(sourceCode, {
        loc: true,
        range: false, // Disable range for performance
        tolerant: true, // Enable tolerant mode for performance
      });

      // Extract contract information without full compilation for performance
      const contractNode = this.findContractNode(ast, contractName);
      if (!contractNode) {
        throw new AnalysisError('Contract not found in source code');
      }

      const functions = this.extractFunctions(contractNode, sourceCode);
      const variables = this.extractVariables(contractNode, sourceCode);
      const events = this.extractEvents(contractNode, sourceCode);
      const modifiers = this.extractModifiers(contractNode, sourceCode);
      const imports = this.extractImports(ast);
      const inheritance = this.extractInheritance(contractNode);

      // Estimate size without full compilation for performance
      const totalSize = this.estimateContractSizeLightweight(sourceCode);

      // PayRox Go Beyond specific analysis (lightweight)
      const facetCandidates = this.identifyFacetCandidates(functions);
      const chunkingRequired = this.requiresChunking(totalSize);
      const storageCollisions = this.detectStorageCollisions(variables);
      const deploymentStrategy = this.determineDeploymentStrategy(totalSize, functions.length);

      return {
        name: contractNode.name,
        sourceCode,
        ast,
        functions,
        variables,
        events,
        modifiers,
        imports,
        inheritance,
        totalSize,
        storageLayout: [], // Skip storage layout for performance
        facetCandidates,
        manifestRoutes: [], // Skip manifest routes for performance
        chunkingRequired,
        runtimeCodehash: '', // Skip codehash for performance
        storageCollisions,
        deploymentStrategy,
      };
    } catch (error: unknown) {
      if (error instanceof AnalysisError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AnalysisError(`Failed to parse contract: ${errorMessage}`);
    }
  }

  /**
   * Estimate contract size without full compilation for UI performance
   */
  private estimateContractSizeLightweight(sourceCode: string): number {
    // Rough estimation: 1 byte per 2 characters of source
    return Math.ceil(sourceCode.length / 2);
  }
  /**
   * Parse functions using regex for lightweight analysis
   * Based on the Deployment Analysis Route implementation
   */
  private parseFunctionsLightweight(sourceCode: string): any[] {
    const re = /function\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*([^{};]*)({|;)/g;
    const functions: any[] = [];
    let m: RegExpExecArray | null;
    const indices: number[] = [];

    // Find all function matches
    while ((m = re.exec(sourceCode)) !== null) {
      indices.push(m.index);
      const name = m[1];
      const paramsRaw = m[2] ?? '';
      const afterSigBlob = (m[3] ?? '').trim();
      const open = m[4]; // '{' or ';'
      functions.push({
        name,
        paramsRaw,
        afterSigBlob,
        bodyOrDecl: open,
        signature: '',
        selector: '0x00000000',
        modifiers: [],
      });
    }

    // Derive slices (rough): from this match index to next match index
    for (let i = 0; i < functions.length; i++) {
      const start = indices[i];
      const end = i + 1 < indices.length ? indices[i + 1] : sourceCode.length;
      functions[i].bodyOrDecl = sourceCode.slice(start, end);
    }

    // Enrich with signatures/selectors and attribute heuristics
    for (const func of functions) {
      const types = this.parseParamTypes(func.paramsRaw);
      func.signature = `${func.name}(${types.join(',')})`;
      func.selector = this.calculateSelectorFromSignature(func.signature);

      const blob = func.afterSigBlob;
      // visibility
      const vis = blob.match(/\b(public|external|internal|private)\b/);
      func.visibility = (vis?.[1] as any) || 'public';
      // state mutability
      const mut = blob.match(/\b(pure|view|payable)\b/);
      func.stateMutability = (mut?.[1] as any) || 'nonpayable';
      // modifiers (heuristic): words that aren't vis/mut/returns/virtual/override
      const mods = blob
        .replace(
          /\b(public|external|internal|private|pure|view|payable|virtual|override|returns)\b/g,
          ' ',
        )
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      func.modifiers = mods;
    }

    return functions;
  }

  /**
   * Parse parameter types from raw parameter string
   * Based on the Deployment Analysis Route implementation
   */
  private parseParamTypes(raw: string): string[] {
    if (!raw.trim()) return [];
    return raw.split(',').map((p) => {
      const t = p
        .trim()
        // strip names & storage when detectible
        .replace(/\b(memory|calldata|storage|payable)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      // Keep the last word as name? We want types → drop trailing identifier if present
      // Heuristic: if there's a space and the last token looks like an identifier, drop it.
      const parts = t.split(' ');
      if (parts.length > 1) {
        const last = parts[parts.length - 1];
        if (/^[A-Za-z_]\w*$/.test(last)) {
          return parts.slice(0, -1).join(' ');
        }
      }
      return t;
    });
  }

  /**
   * Calculate selector from function signature
   * Based on the Deployment Analysis Route implementation
   */
  private calculateSelectorFromSignature(sig: string): string {
    try {
      return this.selectorFromSignature(sig);
    } catch (err) {
      console.warn('Failed to calculate selector from signature:', sig, err);
      return '0x00000000';
    }
  }

  /**
   * Check if function is an admin function
   * Based on the Deployment Analysis Route implementation
   */
  private isAdminFunctionLightweight(name: string, modifiers: string[]): boolean {
    const adminPatterns = [
      /^set[A-Z]/,
      /^update[A-Z]/,
      /^change[A-Z]/,
      /^withdraw/,
      /^pause/,
      /^unpause/,
      /^emergency/,
      /^admin/,
      /^owner/,
      /^manage/,
      /^initialize/,
      /^configure/,
    ];
    return (
      adminPatterns.some((rx) => rx.test(name)) ||
      modifiers.some((m) => /owner|admin|auth|role/i.test(m))
    );
  }

  /**
   * Parse contract with ultra-lightweight mode for maximum UI performance
   * Based on the Deployment Analysis Route implementation
   */
  async parseContractUltraLightweight(sourceCode: string, contractName?: string): Promise<any> {
    try {
      // Get basic contract info without AST parsing
      const sizeBytes = new TextEncoder().encode(sourceCode).length;
      const parsedFunctions = this.parseFunctionsLightweight(sourceCode);
      const functions = parsedFunctions.length;

      // rough per-function size weights by slice length (in bytes)
      const fnSizes: Record<string, number> = {};
      const fnSigs: Record<string, string> = {};
      const fnSels: Record<string, string> = {};

      let totalSliceBytes = 0;
      const sliceBytes = parsedFunctions.map((f) => new TextEncoder().encode(f.bodyOrDecl).length);
      totalSliceBytes = sliceBytes.reduce((a, b) => a + b, 0) || 1;

      parsedFunctions.forEach((f, i) => {
        // weight by share of code slice; cap at source size
        const est = Math.max(300, Math.floor((sliceBytes[i] / totalSliceBytes) * sizeBytes));
        // Key by name (UI expects this); if overloads exist, we aggregate
        fnSizes[f.name] = (fnSizes[f.name] || 0) + est;
        if (!fnSigs[f.name]) fnSigs[f.name] = f.signature;
        if (!fnSels[f.name]) fnSels[f.name] = f.selector;
      });

      // Complexity (heuristic): size + loops + write vs read mix
      const loopCount = (sourceCode.match(/\b(for|while)\s*\(/g) || []).length;
      const writeCount = parsedFunctions.filter(
        (f) => f.stateMutability !== 'view' && f.stateMutability !== 'pure',
      ).length;

      // EIP-170 runtime bytecode limit
      const RUNTIME_LIMIT = 24_576;
      const WARNING_THRESHOLD = Math.floor(RUNTIME_LIMIT * 0.8333);

      let complexity: 'low' | 'medium' | 'high' = 'low';
      if (sizeBytes > WARNING_THRESHOLD || functions > 20 || loopCount > 0 || writeCount > 10) {
        complexity = sizeBytes > RUNTIME_LIMIT || functions > 35 ? 'high' : 'medium';
      }

      // Deployment strategy
      let deploymentStrategy: 'single' | 'faceted' | 'chunked' = 'single';
      if (sizeBytes > RUNTIME_LIMIT) {
        deploymentStrategy = 'chunked';
      } else if (complexity !== 'low' || functions > 15 || writeCount > 8) {
        deploymentStrategy = 'faceted';
      }

      // Group functions → facet candidates (admin/read/write)
      const adminFns = parsedFunctions
        .filter((f) => this.isAdminFunctionLightweight(f.name, f.modifiers))
        .map((f) => f.name);
      const readFns = parsedFunctions
        .filter(
          (f) =>
            !adminFns.includes(f.name) &&
            (f.stateMutability === 'view' || f.stateMutability === 'pure'),
        )
        .map((f) => f.name);
      const writeFns = parsedFunctions
        .filter((f) => !adminFns.includes(f.name) && !readFns.includes(f.name))
        .map((f) => f.name);

      const mkFacet = (name: string, list: string[]): any => {
        if (!list.length) return null;
        const estimatedSize = list.reduce((sum, n) => sum + (fnSizes[n] || 0), 0);
        const signatures = list.map((n) => fnSigs[n]).filter(Boolean) as string[];
        const selectors = list.map((n) => fnSels[n]).filter(Boolean) as string[];
        const functionSizes: Record<string, number> = Object.fromEntries(
          list.map((n) => [n, fnSizes[n] || 0]),
        );
        return {
          name,
          functions: list,
          estimatedSize,
          signatures,
          selectors,
          functionSizes,
        };
      };

      const facetCandidates = [
        mkFacet('AdminFacet', adminFns),
        mkFacet('ReadFacet', readFns),
        mkFacet('WriteFacet', writeFns),
      ].filter(Boolean);

      if (!facetCandidates.length && parsedFunctions.length) {
        const list = parsedFunctions.map((f) => f.name);
        facetCandidates.push(mkFacet('MainFacet', list));
      }

      // Warnings
      const warnings: string[] = [];
      if (sizeBytes > RUNTIME_LIMIT)
        warnings.push(
          `Source size hint ${sizeBytes}B exceeds EIP-170 runtime limit (${RUNTIME_LIMIT}B).`,
        );
      if (functions !== (sourceCode.match(/function\s+\w+/g) || []).length)
        warnings.push('Function parser found patterns beyond simple regex; results are heuristic.');
      if (Object.keys(fnSizes).length === 0)
        warnings.push('Could not derive per-function sizes; estimates will be uniform.');

      return {
        contractName: contractName || 'Unknown',
        functions,
        size: sizeBytes,
        complexity,
        deploymentStrategy,
        facetCandidates,
        functionSizes: fnSizes,
        functionSignatures: fnSigs,
        selectors: fnSels,
        warnings,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AnalysisError(`Failed to parse contract: ${errorMessage}`);
    }
  }
}

export default SolidityAnalyzer;
