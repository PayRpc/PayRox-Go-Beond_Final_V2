// Real, minimal types barrel for ai-assistant backend.
// Expand these as the analyzer and other services need stronger typing.

export interface SourceLocation {
  file?: string;
  // Some callers use numeric offsets for start/end; accept both shapes.
  start?: { line: number; column: number } | number;
  end?: { line: number; column: number } | number;
}

export interface ParameterInfo {
  [key: string]: any;
  name?: string;
  type?: string;
  isIndexed?: boolean;
}

// Allow analyzer to attach many runtime-derived fields; be permissive.
export interface VariableInfo {
  [key: string]: any;
  name: string;
  type?: string;
  visibility?: string;
  isConstant?: boolean;
  isImmutable?: boolean;
  size?: number | any;
  slot?: number | string | any;
  offset?: number | any;
}

export interface FunctionInfo {
  [key: string]: any;
  name: string;
  signature?: string;
  selector?: string;
  visibility?: string;
  stateMutability?: string;
  parameters?: ParameterInfo[] | any;
  returnParameters?: ParameterInfo[] | any;
  modifiers?: any[];
  codeSize?: number | any;
  gasEstimate?: number | any;
  dependencies?: string[] | any;
}

export interface EventInfo {
  [key: string]: any;
  name: string;
  signature?: string;
  parameters?: any[];
}

export interface ModifierInfo {
  [key: string]: any;
  name: string;
  parameters?: any[];
}

export interface ImportInfo {
  [key: string]: any;
  path: string;
  symbols?: any[];
}

export interface StorageSlot {
  [key: string]: any;
  slot: number | string | any;
  offset?: number | any;
  type?: string;
  label?: string;
}

export class CompilationError extends Error {
  public errors?: any[];
  constructor(message: string, errors?: any[]) {
    super(message);
    this.name = 'CompilationError';
    this.errors = errors;
  }
}

export class AnalysisError extends Error {
  public loc?: SourceLocation | any;
  constructor(message: string, loc?: SourceLocation | any) {
    super(message);
    this.name = 'AnalysisError';
    this.loc = loc;
  }
}

export interface ManifestRoute {
  [key: string]: any;
  name: string;
  path: string;
  selector?: string;
  functionName?: string;
  facet?: string;
}

export interface FacetCandidate {
  [key: string]: any;
  name: string;
  functions: any[];
  estimatedSize?: number;
  category?: string;
}

export interface ParsedContract {
  [key: string]: any;
  name: string;
  contractName?: string;
  sourceCode?: string;
  functions?: any[];
  events?: any[];
  variables?: any[];
  modifiers?: any[];
  imports?: any[];
  location?: SourceLocation | any;
  // Analysis outputs
  runtimeCodehash?: string;
  facetCandidates?: any;
  deploymentStrategy?: string;
  chunkingRequired?: boolean;
  storageCollisions?: Array<any>;
  totalSize?: number;
  manifestRoutes?: any[];
  inheritance?: string[];
}
// Named export convenience for `import * as types from '../../types'`
const _default = {} as any;
export default _default;
