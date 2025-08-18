#!/usr/bin/env ts-node
/*
  Prototype parser-based facet splitter.
  - Parses a Solidity contract file using solidity-parser-antlr
  - Builds a simple call graph (best-effort by AST/function-invocation mapping)
  - Groups functions by transitive call-graph closure
  - Packs groups using First-Fit Decreasing (FFD) by estimated compiled size (source size by default)
  - Emits part_N.sol and part_N.json with selectors and metadata
  - Optional: --compile to attempt compilation via an existing Hardhat setup (will shell out to `npx hardhat compile` in a temp dir)

  Usage (from repo root):
    cd tools/splitter
    npm install
    npx ts-node split-facet.ts --source ../../contracts/dispacher/ManifestDispacher.sol --contract ManifestDispatcher --out ../../artifacts/splits --softLimit 22000 [--compile]
*/

import fs from 'fs-extra';
import path from 'path';
import parser from 'solidity-parser-antlr';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import execa from 'execa';
import { keccak256, toUtf8Bytes } from 'ethers';

type FuncInfo = {
  name: string;
  params: string;
  signature: string;
  astNode: any;
  bodyText: string;
};

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('source', { type: 'string', demandOption: true })
    .option('contract', { type: 'string', demandOption: true })
    .option('out', { type: 'string', default: 'artifacts/splits' })
    .option('softLimit', { type: 'number', default: 22000 })
    .option('compile', { type: 'boolean', default: false })
    .argv as any;

  const srcPath = path.resolve(argv.source);
  if (!fs.existsSync(srcPath)) throw new Error('Source file not found: ' + srcPath);
  const src = await fs.readFile(srcPath, 'utf8');

  const ast = parser.parse(src, { tolerant: true, range: true, loc: true });

  // Find the contract node
  let contractNode: any = null;
  parser.visit(ast, {
    ContractDefinition(node: any) {
      if (node.name === argv.contract) contractNode = node;
    }
  });
  if (!contractNode) throw new Error('Contract not found: ' + argv.contract);

  // Collect functions
  const functions: FuncInfo[] = [];
  for (const sub of contractNode.subNodes || []) {
    if (sub.type === 'FunctionDefinition') {
      const name = sub.name || (sub.isConstructor ? 'constructor' : (sub.kind === 'fallback' ? 'fallback' : 'unknown'));
      const params = sub.parameters ? src.slice(sub.parameters.range[0], sub.parameters.range[1]) : '()';
      const sig = `${name}${params}`;
      const bodyText = sub.body ? src.slice(sub.body.range[0], sub.body.range[1]) : '';
      functions.push({ name, params, signature: sig, astNode: sub, bodyText });
    }
  }

  // Build a simple call graph: scan bodies for known function names (best-effort)
  // build name -> indices (handle overloads conservatively)
  const nameToIdxs = new Map<string, number[]>();
  functions.forEach((f, i) => {
    const arr = nameToIdxs.get(f.name) || [];
    arr.push(i);
    nameToIdxs.set(f.name, arr);
  });

  function calledNames(fnNode: any) {
    const out = new Set<string>();
    try {
      parser.visit(fnNode, {
        FunctionCall(node: any) {
          const e = node.expression;
          if (!e) return;
          if (e.type === 'Identifier') out.add(e.name);
          if (e.type === 'MemberAccess') {
            // this.foo() or Identifier.foo()
            if (e.expression && e.expression.type === 'Identifier' && e.expression.name === 'this') {
              out.add(e.memberName);
            }
            if (e.memberName) out.add(e.memberName);
          }
        }
      });
    } catch (e) {
      // ignore
    }
    return [...out];
  }

  const callGraph: number[][] = functions.map(() => []);
  functions.forEach((f, i) => {
    for (const callee of calledNames(f.astNode)) {
      for (const j of (nameToIdxs.get(callee) || [])) callGraph[i].push(j);
    }
  });

  // Use Tarjan's algorithm to compute strongly connected components (SCCs)
  function tarjanSCC(graph: number[][]) {
    const n = graph.length;
    const index = new Array<number>(n).fill(-1);
    const low = new Array<number>(n).fill(0);
    const onstack = new Array<boolean>(n).fill(false);
    const stack: number[] = [];
    let idx = 0;
    const sccs: number[][] = [];

    function dfs(v: number) {
      index[v] = idx;
      low[v] = idx;
      idx++;
      stack.push(v);
      onstack[v] = true;
      for (const w of graph[v]) {
        if (index[w] === -1) {
          dfs(w);
          low[v] = Math.min(low[v], low[w]);
        } else if (onstack[w]) {
          low[v] = Math.min(low[v], index[w]);
        }
      }
      if (low[v] === index[v]) {
        const comp: number[] = [];
        while (true) {
          const w = stack.pop()!;
          onstack[w] = false;
          comp.push(w);
          if (w === v) break;
        }
        sccs.push(comp);
      }
    }

    for (let v = 0; v < n; v++) if (index[v] === -1) dfs(v);
    return sccs;
  }

  const sccs = tarjanSCC(callGraph);
  const groups: Set<number>[] = sccs.map((c) => new Set(c));

  // Prepare group sources and estimate sizes (by source length)
  const groupInfos = groups.map((g, idx) => {
    const funcs = Array.from(g).map((i) => functions[i]);
    const codeParts = funcs.map((f) => f.bodyText);
    const combined = codeParts.join('\n\n');
    const estSize = Buffer.byteLength(combined, 'utf8');
    // compute canonical signatures and selectors using AST where possible
    const selectors: string[] = [];
    for (const f of funcs) {
      const sig = abiSignature(f.astNode);
      if (sig) selectors.push(selectorOf(sig));
    }
    return { idx, funcs, combined, estSize, selectors };
  });

  // Sort groups by estSize desc for FFD
  groupInfos.sort((a, b) => b.estSize - a.estSize);

  const bins: { size: number; groups: typeof groupInfos[0][] }[] = [];
  for (const g of groupInfos) {
    let placed = false;
    for (const bin of bins) {
      if (bin.size + g.estSize <= argv.softLimit) {
        bin.groups.push(g);
        bin.size += g.estSize;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bins.push({ size: g.estSize, groups: [g] });
    }
  }

  // Ensure out dir exists and emit parts
  const outDir = path.resolve(argv.out);
  await fs.ensureDir(outDir);

  const partsMeta: any[] = [];
  for (let i = 0; i < bins.length; i++) {
    const bin = bins[i];
    const partBase = `part_${i}`;
    const contractName = `${argv.contract}_Part_${i}`;
    const selectors: string[] = [];
    const functionsCode: string[] = [];
    for (const g of bin.groups) {
      for (const f of g.funcs) {
        // We will emit the original function AST body (best-effort)
        const start = f.astNode.range ? f.astNode.range[0] : f.astNode.loc?.start?.offset || 0;
        const end = f.astNode.range ? f.astNode.range[1] : f.astNode.loc?.end?.offset || start;
        functionsCode.push(src.slice(start, end));
        selectors.push(...g.selectors);
      }
    }
    const partSol = `// Auto-generated part ${i}\npragma solidity 0.8.30;\ncontract ${contractName} {\n${functionsCode.join('\n\n')}\n}\n`;
    await fs.writeFile(path.join(outDir, partBase + '.sol'), partSol, 'utf8');
  // dedupe selectors
  const uniqSelectors = Array.from(new Set(selectors));
  await fs.writeFile(path.join(outDir, partBase + '.json'), JSON.stringify({ name: contractName, selectors: uniqSelectors, size: Buffer.byteLength(partSol, 'utf8') }, null, 2), 'utf8');
  partsMeta.push({ file: partBase + '.sol', contractName, json: partBase + '.json', selectors: uniqSelectors });
  }

  const combinedManifest = {
    file: srcPath,
    parts: partsMeta.length,
    selectors: partsMeta.reduce((s, p) => s + p.selectors.length, 0),
    parts_list: partsMeta,
  };
  await fs.writeFile(path.join(outDir, 'combined.json'), JSON.stringify(combinedManifest, null, 2), 'utf8');

  console.log('Done. Emitted', partsMeta.length, 'parts to', outDir);

  // If compile flag set, try to compile parts in a temp hardhat project to get deployed bytecode sizes
  if (argv.compile) {
    console.log('Compile-in-loop requested, attempting to compile parts via Hardhat (requires hardhat installed)');
    try {
      const tmp = path.join(process.cwd(), '.tmp_split_compile');
      await fs.remove(tmp);
      await fs.ensureDir(tmp);
      // Create minimal hardhat project
      await fs.writeFile(path.join(tmp, 'hardhat.config.js'), `module.exports = { solidity: '0.8.30' };`, 'utf8');
      await fs.copy(path.join(outDir), path.join(tmp, 'contracts'));
      console.log('Running npx hardhat compile in', tmp);
      await execa('npx', ['hardhat', 'compile', '--force'], { cwd: tmp, stdio: 'inherit' });
      // read artifacts
      const artifactsDir = path.join(tmp, 'artifacts', 'contracts');
      // map sizes
      let anyTooLarge = false;
      for (let i = 0; i < partsMeta.length; i++) {
        const part = partsMeta[i];
        const artPath = path.join(artifactsDir, part.file, `${part.contractName}.json`);
        if (await fs.pathExists(artPath)) {
          const art = await fs.readJson(artPath);
          const bytecode = art.deployedBytecode || art.evm?.deployedBytecode?.object || '';
          const deployedSize = Math.max(0, (bytecode.length - 2) / 2);
          part.deployedSize = deployedSize;
          if (deployedSize >= 24576) {
            part.tooLarge = true;
            anyTooLarge = true;
          }
        }
      }
      // write back manifest with deployed sizes
      await fs.writeFile(path.join(outDir, 'combined.json'), JSON.stringify(combinedManifest, null, 2), 'utf8');
      console.log('Compile-in-loop complete. Updated combined.json with deployed sizes.');
      if (anyTooLarge) {
        console.error('ERROR: One or more parts exceed EIP-170 limit after compilation.');
        process.exit(2);
      }
    } catch (err: any) {
      console.warn('Compile step failed:', err.message || err);
    }
  }
}

function normalizeSig(sig: string) {
  // legacy helper - not used for selectors in the new flow
  const m = sig.match(/^(\w+)\s*(\(.*\))$/s);
  if (!m) return sig;
  const name = m[1];
  const params = m[2].replace(/\s+/g, ' ').trim();
  return `${name}${params}`;
}

function canonicalElementary(t: string) {
  return t.replace(/\buint\b/g, 'uint256').replace(/\bint\b/g, 'int256').trim();
}

function astParamType(p: any): string {
  if (!p || !p.typeName) return 'address';
  const tn = p.typeName;
  if (tn.type === 'ElementaryTypeName') return canonicalElementary(tn.name);
  if (tn.type === 'ArrayTypeName') {
    const base = astParamType({ typeName: tn.baseTypeName });
    const len = tn.length && tn.length.type === 'Literal' ? `[${tn.length.number}]` : '[]';
    return `${base}${len}`;
  }
  // user-defined types -> fallback to namePath or address
  return tn.namePath || 'address';
}

function abiSignature(fn: any) {
  if (!fn || !fn.name || fn.kind === 'constructor' || fn.kind === 'fallback' || fn.kind === 'receive') return null;
  const params = (fn.parameters?.parameters || []).map(astParamType).join(',');
  return `${fn.name}(${params})`;
}

function selectorOf(sig: string) {
  const hash = keccak256(toUtf8Bytes(sig));
  return '0x' + hash.slice(2, 10);
}

main().catch((e) => {
  console.error('ERROR:', e && e.stack ? e.stack : e);
  process.exit(1);
});
