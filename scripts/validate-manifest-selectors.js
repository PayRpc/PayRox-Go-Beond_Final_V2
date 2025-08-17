#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { Interface } = require('ethers');

// --- args ---
const argv = require('minimist')(process.argv.slice(2), {
  string: ['source', 'combined', 'contract'],
  alias: { s: 'source', c: 'combined', n: 'contract' },
});

if (!argv.source || !argv.combined) {
  console.error(
    'Usage: node scripts/validate-manifest-selectors.js --source <file.sol> --combined <combined.json> [--contract <Name>]',
  );
  process.exit(2);
}

const SOURCE_PATH = path.resolve(argv.source);
const COMBINED_PATH = path.resolve(argv.combined);
const TARGET_NAME = argv.contract || null;

// --- helpers ---
function readFileSafely(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function findImports(importPath) {
  // Try relative to source dir
  const rel = path.resolve(path.dirname(SOURCE_PATH), importPath);
  let contents = readFileSafely(rel);
  if (contents !== null) return { contents };

  // Try contracts/ prefix for project-relative imports
  const contractsRel = path.resolve(process.cwd(), 'contracts', importPath);
  contents = readFileSafely(contractsRel);
  if (contents !== null) return { contents };

  // Try project root
  const rootRel = path.resolve(process.cwd(), importPath);
  contents = readFileSafely(rootRel);
  if (contents !== null) return { contents };

  // Try node_modules for @openzeppelin and others
  const nm = path.resolve(process.cwd(), 'node_modules', importPath);
  contents = readFileSafely(nm);
  if (contents !== null) return { contents };

  return { error: 'File not found: ' + importPath };
}

// --- compile via standard-json ---
const input = {
  language: 'Solidity',
  sources: {
    [path.basename(SOURCE_PATH)]: { content: readFileSafely(SOURCE_PATH) },
  },
  settings: {
    outputSelection: {
      '*': { '*': ['abi'] },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === 'error');
  fatal.forEach((e) => console.error(e.formattedMessage || e.message));
  if (fatal.length) process.exit(1);
}

// gather ABIs
const abis = [];
for (const file of Object.keys(output.contracts || {})) {
  for (const contract of Object.keys(output.contracts[file] || {})) {
    const c = output.contracts[file][contract];
    if (!TARGET_NAME || contract === TARGET_NAME) {
      if (c.abi) {
        abis.push(...c.abi);
      }
    }
  }
}

if (abis.length === 0) {
  console.error(`No ABI entries found${TARGET_NAME ? ' for ' + TARGET_NAME : ''}.`);
  process.exit(1);
}

// Build interface and compute function selectors from ABI (handles tuples correctly)
const iface = new Interface(abis);
const compiledSelectors = new Set();

// Use fragments instead of functions property (newer ethers.js pattern)
if (iface.fragments) {
  const functionFragments = iface.fragments.filter((f) => f.type === 'function');

  functionFragments.forEach((fragment) => {
    const selector = iface.getFunction(fragment.name).selector.toLowerCase();
    compiledSelectors.add(selector);
  });
} else {
  // Fallback for older ethers.js
  Object.keys(iface.functions).forEach((sig) => {
    compiledSelectors.add(iface.getSighash(sig).toLowerCase());
  });
}

// Load combined.json from splitter
const combined = JSON.parse(readFileSafely(COMBINED_PATH) || '{}');

// Accept either combined.selectors or combined.parts[*].selectors
let manifestSelectors = new Set();
if (Array.isArray(combined.selectors)) {
  manifestSelectors = new Set(combined.selectors.map((s) => s.toLowerCase()));
} else if (Array.isArray(combined.parts)) {
  combined.parts.forEach((p) => {
    (p.selectors || []).forEach((s) => manifestSelectors.add(String(s).toLowerCase()));
  });
} else {
  // fallback: scan *.json siblings like part_*.json
  const dir = path.dirname(COMBINED_PATH);
  fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f.startsWith('part_'))
    .forEach((f) => {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      (j.selectors || []).forEach((s) => manifestSelectors.add(String(s).toLowerCase()));
    });
}

// Compare
const missingInManifest = [...compiledSelectors].filter((s) => !manifestSelectors.has(s));
const extraInManifest = [...manifestSelectors].filter((s) => !compiledSelectors.has(s));

console.log('— ABI Parity Check —');
console.log('Compiled selectors:', compiledSelectors.size);
console.log('Manifest selectors:', manifestSelectors.size);

if (missingInManifest.length) {
  console.error('\nMissing in manifest (present in ABI):');
  missingInManifest.forEach((s) => console.error('  ' + s));
}

if (extraInManifest.length) {
  console.error('\nExtra in manifest (not in ABI):');
  extraInManifest.forEach((s) => console.error('  ' + s));
}

if (missingInManifest.length || extraInManifest.length) {
  console.error('\n❌ ABI parity FAILED');
  process.exit(1);
}

console.log('\n✅ ABI parity OK');
process.exit(0);
