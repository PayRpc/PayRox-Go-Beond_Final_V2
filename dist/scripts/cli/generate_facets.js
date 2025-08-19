#!/usr/bin/env node
'use strict';
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
const fs = __importStar(require('fs'));
const path = __importStar(require('path'));
const SolidityAnalyzer_1 = require('../analyzers/SolidityAnalyzer');
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
  const strategy = strategyFlag > -1 ? args[strategyFlag + 1] : 'function';
  const resolved = path.resolve(process.cwd(), file);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(2);
  }
  const src = fs.readFileSync(resolved, 'utf8');
  const analyzer = new SolidityAnalyzer_1.SolidityAnalyzer();
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
