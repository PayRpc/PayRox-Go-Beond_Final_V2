#!/usr/bin/env ts-node
// SPDX-License-Identifier: MIT
import fs from 'fs';
import path from 'path';
import { AIRefactorWizard } from '../analyzers/AIRefactorWizard';
import { ParsedContract } from '../types/index';

function readJson(p: string) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function normalizeToParsedContract(input: any): ParsedContract {
  if (input && Array.isArray(input.functions)) return input as ParsedContract;
  if (input && Array.isArray(input.contracts) && input.contracts[0])
    return input.contracts[0] as ParsedContract;
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
  const inputPath = path.resolve(process.cwd(), process.argv[idx + 1]);
  const raw = readJson(inputPath);
  const parsed = normalizeToParsedContract(raw);
  const wizard = new AIRefactorWizard();
  const plan = wizard.makeStrictPlan(parsed, process.cwd());
  process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
}

try {
  main();
} catch (e: any) {
  console.error(JSON.stringify({ ok: false, error: String(e?.message || e) }));
  process.exit(1);
}
