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
const commander_1 = require('commander');
const SolidityAnalyzer_1 = require('../analyzers/SolidityAnalyzer'); // your path is scripts/analyzers/SolidityAnalyzer.ts
const program = new commander_1.Command();
program
  .name('analyze')
  .description('Analyze a Solidity contract and print JSON')
  .argument('<file>', 'Path to .sol file')
  .option('--light', 'Use lightweight parser (no solc compile)', false)
  .option('--contract-name <name>', 'Specific contract name in file')
  .action(async (file, opts) => {
    try {
      const resolved = path.resolve(process.cwd(), file);
      if (!fs.existsSync(resolved)) {
        console.error(`File not found: ${resolved}`);
        process.exit(2);
      }
      const src = fs.readFileSync(resolved, 'utf8');
      const analyzer = new SolidityAnalyzer_1.SolidityAnalyzer();
      const analysis = opts.light
        ? await analyzer.parseContractLightweight(src, opts.contractName)
        : await analyzer.parseContract(src, opts.contractName);
      // If facetCandidates is a Map, convert it to a POJO for JSON.
      const facetMap = analysis.facetCandidates;
      if (facetMap && typeof facetMap.forEach === 'function') {
        const obj = {};
        facetMap.forEach((v, k) => (obj[k] = v));
        analysis.facetCandidates = obj;
      }
      process.stdout.write(JSON.stringify(analysis, null, 2));
    } catch (err) {
      console.error('Analyze failed:', err?.message || String(err));
      process.exit(1);
    }
  });
program.parseAsync(process.argv);
