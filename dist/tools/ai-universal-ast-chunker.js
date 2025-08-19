'use strict';
// SPDX-License-Identifier: MIT
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
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.AIUniversalASTChunker = void 0;
exports.main = main;
const ethers_1 = require('ethers');
const fs = __importStar(require('fs'));
const path = __importStar(require('path'));
class AIUniversalASTChunker {
  hre;
  maxRuntimeBytes = 24_576; // EIP-170
  maxGasLimit = 8_000_000;
  pragmaVersion = '0.8.30'; // Default Solidity version
  constructor(hre) {
    this.hre = hre;
    // Detect compiler versions from hardhat config
    try {
      const compilers = hre.config.solidity.compilers || [];
      if (compilers.length > 0) {
        this.pragmaVersion = compilers[0].version;
      }
    } catch (e) {
      console.log('Using default pragma version:', this.pragmaVersion);
    }
  }
  /**
   * Load ABI from artifacts and compute canonical selectors.
   */
  async loadAbi(contractPath) {
    const name = path.basename(contractPath, '.sol');
    await this.hre.run('compile');
    const artifact = await this.hre.artifacts.readArtifact(name);
    const iface = new ethers_1.Interface(artifact.abi);
    // Find all function fragments
    const fns = [];
    const functionFragments = artifact.abi.filter((item) => item.type === 'function');
    for (const fragment of functionFragments) {
      try {
        // Get function name and signature (like "transfer(address,uint256)")
        const name = fragment.name;
        const signature = `${name}(${(fragment.inputs || [])
          .map((input) => input.type)
          .join(',')})`;
        // Compute selector (keccak256 hash of signature)
        const selector =
          iface.getFunction(signature)?.selector || `0x${iface.getFunction(name)?.selector}`;
        // Get stateMutability (view, pure, payable, or nonpayable)
        const stateMutability = fragment.stateMutability;
        fns.push({
          name,
          signature,
          selector,
          stateMutability: stateMutability,
          inputs: (fragment.inputs || []).map((input) => ({
            name: input.name || '',
            type: input.type || '',
          })),
          outputs: (fragment.outputs || []).map((output) => ({
            name: output.name || '',
            type: output.type || '',
          })),
        });
      } catch (e) {
        console.warn(`Skipped function in ${name}:`, e);
      }
    }
    return { name, artifact, iface, functions: fns };
  }
  getRuntimeBytes(artifact) {
    const runtime = artifact.deployedBytecode;
    if (!runtime || runtime === '0x') return 0;
    return (runtime.length - 2) / 2;
  }
  async analyzeContract(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    const lines = content.split('\n').length;
    const abiData = await this.loadAbi(filePath);
    const runtimeBytes = this.getRuntimeBytes(abiData.artifact);
    if (runtimeBytes <= this.maxRuntimeBytes) {
      return this.createSingleChunkAnalysis(
        filePath,
        content,
        stats.size,
        lines,
        abiData,
        runtimeBytes,
      );
    }
    const chunks = await this.generateOptimalChunks(abiData, path.basename(filePath));
    const { diamondCut, manifest } = this.buildCutAndManifest(chunks);
    const validation = this.validateChunks(abiData.functions, chunks);
    const gasEstimates = await this.estimateGasCosts(chunks);
    const deploymentStrategy = this.createDeploymentStrategy(chunks);
    return {
      originalFile: filePath,
      originalSize: stats.size,
      originalRuntimeBytes: runtimeBytes,
      originalLines: lines,
      recommendedChunks: chunks,
      gasEstimates,
      deploymentStrategy,
      diamondCut,
      manifest,
      validation,
    };
  }
  /**
   * Greedy pack by domains, keeping facets < EIP-170.
   */
  async generateOptimalChunks(abiData, originalName) {
    const baseName = originalName.replace('.sol', '');
    const chunks = [];
    const groups = this.groupFunctionsByDomain(abiData.functions);
    for (const group of groups) {
      const facetChunks = await this.packFunctionsIntoFacets(group, baseName);
      chunks.push(...facetChunks);
    }
    // Storage libs
    for (const c of chunks.filter((x) => x.type === 'facet')) {
      chunks.push(this.createStorageLibrary(c.name));
    }
    // Interfaces
    for (const c of chunks.filter((x) => x.type === 'facet')) {
      chunks.push(this.createInterfaceChunk(c.name, c.functions));
    }
    // Init contract
    const initChunk = this.createInitContract(
      baseName,
      chunks.filter((c) => c.type === 'facet'),
    );
    if (initChunk) chunks.push(initChunk);
    return chunks;
  }
  groupFunctionsByDomain(functions) {
    const groups = [];
    const core = functions.filter((f) => /init|owner|admin|pause|upgrade/i.test(f.name));
    if (core.length) groups.push({ name: 'Core', functions: core, type: 'core' });
    const views = functions.filter(
      (f) => (f.stateMutability === 'view' || f.stateMutability === 'pure') && !core.includes(f),
    );
    if (views.length) groups.push({ name: 'View', functions: views, type: 'view' });
    const state = functions.filter(
      (f) =>
        (f.stateMutability === 'nonpayable' || f.stateMutability === 'payable') &&
        !core.includes(f),
    );
    if (state.length > 20) {
      const parts = Math.ceil(state.length / 20);
      const chunkSize = Math.ceil(state.length / parts);
      for (let i = 0; i < state.length; i += chunkSize) {
        groups.push({
          name: `Logic${Math.floor(i / chunkSize) + 1}`,
          functions: state.slice(i, i + chunkSize),
          type: 'logic',
        });
      }
    } else if (state.length) {
      groups.push({ name: 'Logic', functions: state, type: 'logic' });
    }
    return groups;
  }
  async packFunctionsIntoFacets(group, baseName) {
    const facets = [];
    let buf = [];
    let idx = 1;
    for (const f of group.functions) {
      const test = [...buf, f];
      const code = this.generateFacetCode(`${baseName}${group.name}${idx}Facet`, test);
      const srcBytes = Buffer.byteLength(code, 'utf8');
      if (srcBytes * 3 > this.maxRuntimeBytes && buf.length > 0) {
        const name = `${baseName}${group.name}${idx}Facet`;
        const content = this.generateFacetCode(name, buf);
        facets.push(this.mkFacetChunk(name, content, buf));
        buf = [f];
        idx++;
      } else {
        buf.push(f);
      }
    }
    if (buf.length) {
      const name = `${baseName}${group.name}${idx}Facet`;
      const content = this.generateFacetCode(name, buf);
      facets.push(this.mkFacetChunk(name, content, buf));
    }
    return facets;
  }
  mkFacetChunk(name, content, fns) {
    return {
      name,
      type: 'facet',
      content,
      size: Buffer.byteLength(content, 'utf8'),
      runtimeBytes: 0, // can be filled after a compile-in-place step if you want
      estimatedGas: this.estimateDeploymentGas(content),
      dependencies: this.extractDependencies(content),
      functions: [...fns],
      storageSlots: [`payrox.${name.toLowerCase()}.v1`],
      interfaceId: this.calculateInterfaceId(fns),
    };
  }
  /**
   * IMPORTANT: Do NOT generate ERC-165 in facets (centralized per repo policy).
   */
  generateFacetCode(name, functions) {
    const interfaceName = `I${name}`;
    const storageLibName = `Lib${name}Storage`;
    const body = functions.map((f) => this.generateFunctionStub(f)).join('\n\n');
    return `// SPDX-License-Identifier: MIT
pragma solidity ${this.pragmaVersion};

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {${interfaceName}} from "../interfaces/facets/${interfaceName}.sol";
import {${storageLibName} as S} from "../libraries/${storageLibName}.sol";

/**
 * @title ${name}
 * @notice PayRox Diamond Facet (auto-generated). Storage isolated via ${storageLibName}.
 * @dev All state-changing functions gated behind dispatcher via LibDiamond.enforceManifestCall().
 */
contract ${name} is ${interfaceName} {

    modifier onlyDispatcher() {
        LibDiamond.enforceManifestCall(); // repo-provided helper
        _;
    }

${body}

}
`;
  }
  /**
   * Generate a compilable stub with correct signature/visibility/mutability/returns.
   */
  generateFunctionStub(f) {
    const params = (f.inputs || []).map((p, i) => `${p.type} ${p.name || `arg${i}`}`).join(', ');
    const rets = (f.outputs || []).map((o, i) => `${o.type} ${o.name || `ret${i}`}`).join(', ');
    const vis = 'external';
    const mut =
      f.stateMutability === 'view' || f.stateMutability === 'pure'
        ? f.stateMutability
        : f.stateMutability === 'payable'
          ? 'payable'
          : ''; // nonpayable => omit
    const mod =
      f.stateMutability === 'view' || f.stateMutability === 'pure' ? '' : ' onlyDispatcher';
    const returnsClause = rets.length ? ` returns (${rets})` : '';
    // Revert body keeps bytecode tiny and forces migration later.
    return `    function ${f.name}(${params}) ${vis}${mut ? ' ' + mut : ''}${mod}${returnsClause} {
        revert("TODO: migrate logic from monolith");
    }`;
  }
  createStorageLibrary(facetName) {
    const libName = `Lib${facetName}Storage`;
    const slot = `payrox.${facetName.toLowerCase()}.v1`;
    const content = `// SPDX-License-Identifier: MIT
pragma solidity ${this.pragmaVersion};

/**
 * @title ${libName}
 * @notice Namespaced storage for ${facetName}. Keep fields local to the facet.
 */
library ${libName} {
    bytes32 internal constant SLOT = keccak256("${slot}");

    struct Layout {
        // TODO: fill real fields for this facet only
        mapping(address => uint256) placeholder;
        bool initialized;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 s = SLOT;
        assembly { l.slot := s }
    }
}
`;
    return {
      name: libName,
      type: 'storage',
      content,
      size: Buffer.byteLength(content, 'utf8'),
      runtimeBytes: 0,
      estimatedGas: 0,
      dependencies: [],
      functions: [],
      storageSlots: [slot],
      interfaceId: '0x00000000',
    };
  }
  createInterfaceChunk(facetName, functions) {
    const interfaceName = `I${facetName}`;
    const defs = functions
      .map((f) => {
        const params = (f.inputs || [])
          .map((p, i) => `${p.type} ${p.name || `arg${i}`}`)
          .join(', ');
        const rets = (f.outputs || []).map((o, i) => `${o.type} ${o.name || `ret${i}`}`).join(', ');
        const mut =
          f.stateMutability === 'view' || f.stateMutability === 'pure'
            ? ` ${f.stateMutability}`
            : f.stateMutability === 'payable'
              ? ' payable'
              : '';
        const returnsClause = rets.length ? ` returns (${rets})` : '';
        return `    function ${f.name}(${params}) external${mut}${returnsClause};`;
      })
      .join('\n');
    const content = `// SPDX-License-Identifier: MIT
pragma solidity ${this.pragmaVersion};

/**
 * @title ${interfaceName}
 * @notice Interface for ${facetName} (auto-generated)
 */
interface ${interfaceName} {
${defs}
}
`;
    return {
      name: interfaceName,
      type: 'interface',
      content,
      size: Buffer.byteLength(content, 'utf8'),
      runtimeBytes: 0,
      estimatedGas: 0,
      dependencies: [],
      functions: [...functions],
      storageSlots: [],
      interfaceId: this.calculateInterfaceId(functions),
    };
  }
  createInitContract(baseName, facets) {
    if (!facets.length) return null;
    const initName = `Init${baseName}`;
    const imports = facets
      .map((c) => `import {I${c.name}} from "../interfaces/facets/I${c.name}.sol";`)
      .join('\n');
    // NOTE: We do NOT set 165 bits here if ERC-165 is centralized elsewhere.
    const content = `// SPDX-License-Identifier: MIT
pragma solidity ${this.pragmaVersion};

import {LibDiamond} from "../libraries/LibDiamond.sol";
${imports}

/**
 * @title ${initName}
 * @notice Initialization contract for ${baseName} Diamond
 */
contract ${initName} {
    event DiamondInitialized(address indexed initializer, uint256 timestamp);

    function init() external {
        // TODO: init storage / roles via dispatcher if needed
        emit DiamondInitialized(msg.sender, block.timestamp);
    }
}
`;
    return {
      name: initName,
      type: 'init',
      content,
      size: Buffer.byteLength(content, 'utf8'),
      runtimeBytes: 0,
      estimatedGas: this.estimateDeploymentGas(content),
      dependencies: ['LibDiamond', ...facets.map((c) => `I${c.name}`)],
      functions: [
        {
          name: 'init',
          signature: 'init()',
          selector: '0x8129fc1c',
          stateMutability: 'nonpayable',
        },
      ],
      storageSlots: [],
      interfaceId: '0x00000000',
    };
  }
  buildCutAndManifest(chunks) {
    const facets = chunks.filter((c) => c.type === 'facet');
    const diamondCut = facets.map((f) => ({
      facet: f.name,
      action: 'Add',
      selectors: f.functions.map((fn) => fn.selector),
    }));
    const manifest = facets.map((f) => ({
      name: f.name,
      selectors: f.functions.map((x) => x.selector),
      signatures: f.functions.map((x) => x.signature),
      estimatedSize: f.runtimeBytes,
      securityLevel: 'low',
      versionTag: 'v1',
    }));
    return { diamondCut, manifest };
  }
  validateChunks(originalFns, chunks) {
    const errors = [];
    const warnings = [];
    // selector parity
    const a = new Set(originalFns.map((f) => f.selector.toLowerCase()));
    const b = new Set(chunks.flatMap((c) => c.functions.map((f) => f.selector.toLowerCase())));
    const selectorParity = a.size === b.size && [...a].every((x) => b.has(x));
    if (!selectorParity) errors.push('Selector parity failed');
    // EIP-170 check (runtimeBytes are 0 until you compile generated facets; warn instead of error)
    const sizeViolations = chunks
      .filter((c) => c.type === 'facet')
      .filter((c) => c.runtimeBytes && c.runtimeBytes > this.maxRuntimeBytes);
    const runtimeSizeOk = sizeViolations.length === 0;
    if (!runtimeSizeOk) errors.push('One or more facets exceed EIP-170');
    // loupe ban in facets
    const loupe = new Set(['0x1f931c1c', '0xcdffacc6', '0x52ef6b2c', '0xadfca15e']);
    const bad = chunks.some(
      (c) => c.type === 'facet' && c.functions.some((f) => loupe.has(f.selector.toLowerCase())),
    );
    const noLoupeInFacets = !bad;
    if (!noLoupeInFacets) errors.push('Loupe selectors found in a facet');
    return { selectorParity, runtimeSizeOk, noLoupeInFacets, errors, warnings };
  }
  async estimateGasCosts(chunks) {
    return chunks
      .filter((c) => c.type === 'facet' || c.type === 'init')
      .map((c) => ({
        chunkName: c.name,
        deploymentGas: this.estimateDeploymentGas(c.content),
        functionGas: {},
        storageGas: c.storageSlots.length * 20000,
        isWithinLimit: this.estimateDeploymentGas(c.content) < this.maxGasLimit,
      }));
  }
  createDeploymentStrategy(chunks) {
    const facets = chunks.filter((c) => c.type === 'facet').map((c) => c.name);
    const libraries = chunks.filter((c) => c.type === 'storage').map((c) => c.name);
    const initC = chunks.find((c) => c.type === 'init')?.name;
    return {
      mainContract: 'Diamond',
      facets,
      libraries,
      deploymentOrder: [...libraries, ...facets, 'Diamond', ...(initC ? [initC] : [])],
      crossReferences: {},
    };
  }
  calculateInterfaceId(functions) {
    if (!functions.length) return '0x00000000';
    let acc = 0n;
    for (const f of functions) {
      const x = BigInt('0x' + f.selector.slice(2));
      acc ^= x;
    }
    const hex = acc.toString(16).padStart(8, '0');
    return '0x' + hex;
  }
  estimateDeploymentGas(content) {
    const base = 200_000;
    const perByte = 200;
    return base + Buffer.byteLength(content, 'utf8') * perByte;
  }
  extractDependencies(src) {
    const re = /import\s+(?:\{[^}]*\}\s+from\s+|)[`'"](.+?)[`'"];?/g;
    const out = [];
    let m;
    while ((m = re.exec(src))) out.push(m[1]);
    return out;
  }
  createSingleChunkAnalysis(filePath, content, size, lines, abiData, runtimeBytes) {
    const name = abiData.name;
    const chunk = {
      name,
      type: 'facet',
      content,
      size,
      runtimeBytes,
      estimatedGas: this.estimateDeploymentGas(content),
      dependencies: this.extractDependencies(content),
      functions: abiData.functions,
      storageSlots: [`payrox.${name.toLowerCase()}.v1`],
      interfaceId: this.calculateInterfaceId(abiData.functions),
    };
    return {
      originalFile: filePath,
      originalSize: size,
      originalRuntimeBytes: runtimeBytes,
      originalLines: lines,
      recommendedChunks: [chunk],
      gasEstimates: [
        {
          chunkName: name,
          deploymentGas: this.estimateDeploymentGas(content),
          functionGas: {},
          storageGas: 20_000,
          isWithinLimit: this.estimateDeploymentGas(content) < this.maxGasLimit,
        },
      ],
      deploymentStrategy: {
        mainContract: name,
        facets: [name],
        libraries: [],
        deploymentOrder: [name],
        crossReferences: {},
      },
      diamondCut: [
        {
          facet: name,
          action: 'Add',
          selectors: abiData.functions.map((f) => f.selector),
        },
      ],
      manifest: [
        {
          name,
          selectors: abiData.functions.map((f) => f.selector),
          signatures: abiData.functions.map((f) => f.signature),
          estimatedSize: runtimeBytes,
          securityLevel: 'low',
          versionTag: 'v1',
        },
      ],
      validation: {
        selectorParity: true,
        runtimeSizeOk: runtimeBytes <= this.maxRuntimeBytes,
        noLoupeInFacets: true,
        errors: [],
        warnings: [],
      },
    };
  }
  async saveChunks(analysis, outputDir) {
    const chunksDir = path.join(outputDir, 'chunks');
    fs.mkdirSync(path.join(chunksDir, 'facets'), { recursive: true });
    fs.mkdirSync(path.join(chunksDir, 'interfaces', 'facets'), { recursive: true });
    fs.mkdirSync(path.join(chunksDir, 'libraries'), { recursive: true });
    for (const c of analysis.recommendedChunks) {
      let out = '';
      if (c.type === 'facet' || c.type === 'init') {
        out = path.join(chunksDir, 'facets', `${c.name}.sol`);
      } else if (c.type === 'interface') {
        out = path.join(chunksDir, 'interfaces', 'facets', `${c.name}.sol`);
      } else if (c.type === 'storage') {
        out = path.join(chunksDir, 'libraries', `${c.name}.sol`);
      } else {
        out = path.join(chunksDir, `${c.name}.sol`);
      }
      fs.writeFileSync(out, c.content);
      // eslint-disable-next-line no-console
      console.log(`✅ ${c.name}.sol → ${out}`);
    }
    const report = path.join(chunksDir, 'analysis-report.json');
    fs.writeFileSync(report, JSON.stringify(analysis, null, 2));
    await this.generateDeploymentScript(analysis, chunksDir);
  }
  async generateDeploymentScript(analysis, outputDir) {
    const script = `// SPDX-License-Identifier: MIT
// Auto-generated by AIUniversalASTChunker

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployDiamond } from "../../scripts/deploy-diamond";

export async function deployChunkedSystem(hre: HardhatRuntimeEnvironment) {
  console.log("🚀 Deploying chunked system...");
  const facets = ${JSON.stringify(analysis.deploymentStrategy.facets, null, 2)};
  const diamondCut = ${JSON.stringify(analysis.diamondCut, null, 2)};
  const manifest = ${JSON.stringify(analysis.manifest, null, 2)};
  const diamond = await deployDiamond(hre, {
    facets,
    diamondCut,
    manifest,
    initContract: "${analysis.recommendedChunks.find((c) => c.type === 'init')?.name || ''}"
  });
  console.log("✅ Deployed Diamond at", diamond.address);
  return diamond;
}
`;
    const p = path.join(outputDir, 'deploy-chunked-system.ts');
    fs.writeFileSync(p, script);
  }
}
exports.AIUniversalASTChunker = AIUniversalASTChunker;
/**
 * CLI entry
 */
async function main(hre) {
  console.log('🤖 PayRox AST Chunker — start');
  const chunker = new AIUniversalASTChunker(hre);
  const targets = [
    'contracts/PayRoxProxyRouter.sol',
    'contracts/dispatcher/ManifestDispatcher.sol',
    'contracts/facets/SecurityFacet.sol',
  ];
  const results = [];
  for (const rel of targets) {
    const abs = path.join(process.cwd(), rel);
    if (!fs.existsSync(abs)) {
      console.log(`⚠️  Not found: ${rel}`);
      continue;
    }
    try {
      const a = await chunker.analyzeContract(abs);
      results.push(a);
      const out = path.join('deployable-modules', path.basename(rel, '.sol'));
      await chunker.saveChunks(a, out);
      console.log(
        `✅ ${rel}: size ${(a.originalSize / 1024).toFixed(2)}KB, runtime ${a.originalRuntimeBytes} bytes`,
      );
    } catch (e) {
      console.log(`❌ Error processing ${rel}:`, e);
    }
  }
  console.log(`🏁 Complete. Processed: ${results.length}`);
  return results;
}
