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
  } catch (e) {
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

  return { error: `File not found: ${importPath}` };
}

// --- main ---
console.log('— ABI Parity Check —');

const sourceContent = readFileSafely(SOURCE_PATH);
if (!sourceContent) {
  console.error(`Failed to read source file: ${SOURCE_PATH}`);
  process.exit(1);
}

const fileName = path.basename(SOURCE_PATH);
const input = {
  language: 'Solidity',
  sources: {
    [fileName]: {
      content: sourceContent,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === 'error');
  if (fatal.length > 0) {
    console.error('Compilation errors:');
    fatal.forEach((e) => console.error(e.formattedMessage || e.message));
    process.exit(1);
  }
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
const manifestSelectors = new Set();

// Extract selectors from combined manifest
for (const entry of combined.parts || []) {
  if (entry.selectors && Array.isArray(entry.selectors)) {
    for (const sel of entry.selectors) {
      if (typeof sel === 'string' && sel.match(/^0x[0-9a-f]{8}$/i)) {
        manifestSelectors.add(sel.toLowerCase());
      }
    }
  }
}

// Compare sets
const missingInManifest = [...compiledSelectors].filter((s) => !manifestSelectors.has(s));
const extraInManifest = [...manifestSelectors].filter((s) => !compiledSelectors.has(s));

console.log(`Compiled selectors: ${compiledSelectors.size}`);
console.log(`Manifest selectors: ${manifestSelectors.size}`);

if (missingInManifest.length > 0) {
  console.log('\nMissing in manifest (present in ABI):');
  missingInManifest.forEach((s) => console.log(`  ${s}`));
}

if (extraInManifest.length > 0) {
  console.log('\nExtra in manifest (not in ABI):');
  // For extra selectors, try to decode them back to function signatures from combined.json
  for (const entry of combined.parts || []) {
    if (entry.selectors && Array.isArray(entry.selectors)) {
      entry.selectors.forEach((sel) => {
        if (typeof sel === 'string') {
          if (sel.match(/^0x[0-9a-f]{8}$/i) && extraInManifest.includes(sel.toLowerCase())) {
            console.log(`  ${sel.toLowerCase()}`);
          } else if (extraInManifest.length > 0) {
            // This is a function signature, not a hex selector
            console.log(`  ${sel}`);
          }
        }
      });
    }
  }
}

if (missingInManifest.length === 0 && extraInManifest.length === 0) {
  console.log('✅ ABI parity OK');
  process.exit(0);
}

console.log('\n❌ ABI parity FAILED');
process.exit(1);
