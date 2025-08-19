#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

import { SolidityAnalyzer } from '../analyzers/SolidityAnalyzer';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error(
      'Usage: generate_facets.ts <sol-file> [--maxChunkSize N] [--strategy function|feature|gas]',
    );
    process.exit(2);
  }

  const file = args[0];
  const maxChunkSizeFlag = args.indexOf('--maxChunkSize');
  const strategyFlag = args.indexOf('--strategy');
  const maxChunkSize = maxChunkSizeFlag > -1 ? Number(args[maxChunkSizeFlag + 1]) : 24576;
  const strategy =
    strategyFlag > -1 ? (args[strategyFlag + 1] as 'function' | 'feature' | 'gas') : 'function';

  const resolved = path.resolve(process.cwd(), file);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(2);
  }

  const src = fs.readFileSync(resolved, 'utf8');
  const analyzer = new SolidityAnalyzer();

  console.log(
    `Planning facets for ${resolved} (strategy=${strategy}, maxChunkSize=${maxChunkSize})`,
  );

  const result = await analyzer.refactorContract(src, { maxChunkSize, strategy });

  if (!result || !result.patches) {
    console.error('No patches returned by analyzer');
    process.exit(1);
  }

  const outDir = path.dirname(resolved);
  for (const p of result.patches) {
    const outPath = path.join(outDir, p.file);
    fs.writeFileSync(outPath, p.snippet, { encoding: 'utf8' });
    console.log(`Wrote facet stub: ${outPath}`);
  }

  console.log(`Generated ${result.patches.length} facet stub(s). Summary: ${result.summary}`);
}

main().catch((err) => {
  console.error('Error generating facets:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
