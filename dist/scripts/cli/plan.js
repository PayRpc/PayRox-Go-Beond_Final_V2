#!/usr/bin/env ts-node
'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
// SPDX-License-Identifier: MIT
const fs_1 = __importDefault(require('fs'));
const path_1 = __importDefault(require('path'));
const AIRefactorWizard_1 = require('../analyzers/AIRefactorWizard');
function readJson(p) {
  return JSON.parse(fs_1.default.readFileSync(p, 'utf8'));
}
function normalizeToParsedContract(input) {
  if (input && Array.isArray(input.functions)) return input;
  if (input && Array.isArray(input.contracts) && input.contracts[0]) return input.contracts[0];
  throw new Error('Unrecognized analyzer JSON: expected {functions:[]} or {contracts:[...]}');
}
function main() {
  const flag = '--input';
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error(
      JSON.stringify({ ok: false, error: `Usage: node plan.js ${flag} <analyzer.json>` }),
    );
    process.exit(1);
  }
  const inputPath = path_1.default.resolve(process.cwd(), process.argv[idx + 1]);
  const raw = readJson(inputPath);
  const parsed = normalizeToParsedContract(raw);
  const wizard = new AIRefactorWizard_1.AIRefactorWizard();
  const plan = wizard.makeStrictPlan(parsed, process.cwd());
  process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
}
try {
  main();
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: String(e?.message || e) }));
  process.exit(1);
}
