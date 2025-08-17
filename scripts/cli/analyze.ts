#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';

import { SolidityAnalyzer } from '../analyzers/SolidityAnalyzer'; // your path is scripts/analyzers/SolidityAnalyzer.ts

const program = new Command();

program
  .name('analyze')
  .description('Analyze a Solidity contract and print JSON')
  .argument('<file>', 'Path to .sol file')
  .option('--light', 'Use lightweight parser (no solc compile)', false)
  .option('--contract-name <name>', 'Specific contract name in file')
  .action(async (file: string, opts: { light?: boolean; contractName?: string }) => {
    try {
      const resolved = path.resolve(process.cwd(), file);
      if (!fs.existsSync(resolved)) {
        console.error(`File not found: ${resolved}`);
        process.exit(2);
      }

      const src = fs.readFileSync(resolved, 'utf8');
      const analyzer = new SolidityAnalyzer();

      const analysis = opts.light
        ? await analyzer.parseContractLightweight(src, opts.contractName)
        : await analyzer.parseContract(src, opts.contractName);

      // If facetCandidates is a Map, convert it to a POJO for JSON.
      const facetMap = (analysis as any).facetCandidates;
      if (facetMap && typeof facetMap.forEach === 'function') {
        const obj: Record<string, unknown> = {};
        facetMap.forEach((v: unknown, k: string) => (obj[k] = v));
        (analysis as any).facetCandidates = obj;
      }

      process.stdout.write(JSON.stringify(analysis, null, 2));
    } catch (err) {
      console.error('Analyze failed:', (err as Error)?.message || String(err));
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
