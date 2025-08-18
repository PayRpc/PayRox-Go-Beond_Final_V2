#!/usr/bin/env ts-node
/**
 * Dynamic splitter orchestrator
 * - Accepts a single file, a folder, or a glob (e.g., "contracts/**/*.sol")
 * - Parses each file, discovers all ContractDefinition nodes
 * - Invokes split-facet.ts for every discovered contract
 * - Optionally runs selector parity for each contract
 */

import fg from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';
import parser from 'solidity-parser-antlr';
import execa from 'execa';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Interface, keccak256, toUtf8Bytes } from 'ethers';

type Args = {
  source: string;            // file | folder | glob
  out: string;               // output root
  softLimit: number;         // soft limit per part
  compile: boolean;          // pass-through to split-facet
  parity: boolean;           // verify selector parity against artifacts
  exclude?: string[];        // globs to ignore
  eip170?: number;           // hard limit (default 24576)
  margin?: number;           // safety margin subtracted from eip170 to get softLimit
};

function sigSelector(sig: string) {
  return '0x' + keccak256(toUtf8Bytes(sig)).slice(2, 10);
}

async function findContracts(solPath: string): Promise<string[]> {
  const src = await fs.readFile(solPath, 'utf8');
  const ast = parser.parse(src, { tolerant: true, range: true, loc: true });
  const names: string[] = [];
  parser.visit(ast, {
    ContractDefinition(node: any) {
      if (node?.name) names.push(node.name);
    }
  });
  return names;
}

async function checkParity(
  relSrcFile: string,
  contractName: string,
  partsDir: string
): Promise<void> {
  // artifacts/contracts/<relSrcFile>.sol/<ContractName>.json
  const artPath = path.join(
    'artifacts',
    'contracts',
    relSrcFile,
    `${contractName}.json`
  );
  if (!(await fs.pathExists(artPath))) {
    console.warn(`(parity) Missing artifact: ${artPath} — skipping.`);
    return;
  }
  const art = await fs.readJson(artPath);
  const iface = new Interface(art.abi);

  const original = new Set<string>();
  for (const f of Object.values(iface.functions)) {
    // ethers v6: canonical signature with f.format()
    // @ts-ignore
    const canon = (f as any).format();
    original.add(sigSelector(canon));
  }

  const combinedPath = path.join(partsDir, 'combined.json');
  if (!(await fs.pathExists(combinedPath))) {
    throw new Error(`combined.json not found at ${combinedPath}`);
  }
  const combined = await fs.readJson(combinedPath);
  const partsSelectors = new Set<string>();
  for (const p of combined.parts_list || []) {
    for (const s of p.selectors || []) partsSelectors.add(s);
  }

  const missing = [...original].filter(x => !partsSelectors.has(x));
  const extra =   [...partsSelectors].filter(x => !original.has(x));
  if (missing.length || extra.length) {
    throw new Error(
      `Selector parity FAILED for ${contractName}\n` +
      (missing.length ? `  Missing in parts: ${missing.join(', ')}\n` : '') +
      (extra.length   ? `  Extra in parts:   ${extra.join(', ')}\n` : '')
    );
  }
  console.log(`✅ Parity OK: ${contractName}`);
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('source', { type: 'string', demandOption: true, desc: 'file | folder | glob (e.g. contracts/**/*.sol)' })
    .option('out', { type: 'string', default: 'artifacts/splits' })
    .option('softLimit', { type: 'number', default: 22000 })
    .option('compile', { type: 'boolean', default: false })
    .option('parity', { type: 'boolean', default: true })
    .option('exclude', { type: 'array', default: [] })
    .option('eip170', { type: 'number', default: 24576 })
    .option('margin', { type: 'number', default: 1500 })
    .argv as unknown as Args;

  // If user provided eip170 + margin, recompute softLimit unless explicit softLimit was also passed.
  const derivedSoft = Math.max(0, (argv.eip170 ?? 24576) - (argv.margin ?? 1500));
  const softLimit = argv.softLimit || derivedSoft;

  const patterns = Array.isArray(argv.exclude) && argv.exclude.length
    ? [argv.source, ...argv.exclude.map((e) => '!' + e)]
    : [argv.source];

  const files = await fg(patterns, { dot: false, onlyFiles: true, absolute: true });
  if (!files.length) {
    throw new Error(`No Solidity files matched: ${argv.source}`);
  }

  let anyFailed = false;

  for (const abs of files) {
    if (!abs.endsWith('.sol')) continue;

    const relFromContracts = path.relative(path.join(process.cwd(), 'contracts'), abs);
    const relSrcForArtifacts = relFromContracts.replace(/\\/g, '/'); // for Windows

    const contracts = await findContracts(abs);
    if (!contracts.length) continue;

    for (const name of contracts) {
      const outDir = path.join(argv.out, relSrcForArtifacts.replace(/\.sol$/, ''), name);
      await fs.ensureDir(outDir);

      console.log(`\n==> Splitting ${relSrcForArtifacts} :: ${name}`);
      try {
        // Call your existing splitter with discovered contract name
        await execa(
          'npx',
          [
            'ts-node',
            'tools/splitter/split-facet.ts',
            '--source', abs,
            '--contract', name,
            '--out', outDir,
            '--softLimit', String(softLimit),
            ...(argv.compile ? ['--compile'] : [])
          ],
          { stdio: 'inherit' }
        );

        if (argv.parity) {
          await checkParity(relSrcForArtifacts, name, outDir);
        }
      } catch (err: any) {
        anyFailed = true;
        console.error(`❌ Split failed for ${name}:`, err?.message || err);
      }
    }
  }

  if (anyFailed) process.exit(2);
  console.log('\n✅ Done. All splits complete.');
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
