#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { keccak256, toUtf8Bytes } = require('ethers');

// --- args ---
const argv = require('minimist')(process.argv.slice(2), {
  string: ['source', 'combined', 'contract', 'mode'],
  alias: { s: 'source', c: 'combined', n: 'contract', m: 'mode' },
  default: { mode: 'subset' },
});

if (!argv.source || !argv.combined) {
  console.error(
    'Usage: node scripts/validate-manifest-selectors.js --source <file.sol> --combined <combined.json> [--contract <Name>] [--mode subset|strict]',
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

// --- selector normalization helpers ---
// Canonical selector from signature "fnName(type1,type2,...)"
// Normalize a signature string to canonical form: name(type1,type2,...)
function normalizeSignature(sig) {
  const s = String(sig).trim();
  const m = s.match(/^([^()]+)\(([\s\S]*)\)$/);
  if (!m) return s.replace(/\s+/g, '');
  const name = m[1].trim();
  const inner = m[2].trim();
  if (inner === '') return `${name}()`;

  // split params at top-level commas (respect nested parentheses for tuples)
  const parts = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur) parts.push(cur);

  const types = parts.map((p) => {
    // pick first token (the type), e.g. 'bytes4 selector' -> 'bytes4'
    const tok = p.trim().split(/\s+/)[0] || '';
    return tok.trim();
  });

  return `${name}(${types.join(',')})`;
}

function sigToSelector(sig) {
  const canonical = normalizeSignature(sig);
  // Try to resolve name casing and exact param types against compiled ABIs
  function resolveAgainstAbi(canonicalSig) {
    const m = canonicalSig.match(/^([^()]+)\((.*)\)$/);
    if (!m) return canonicalSig;
    const name = m[1];
    const inner = m[2];
    const wantedTypes = inner === '' ? [] : inner.split(',').map((t) => t.trim());

    for (const item of abis) {
      if (item.type !== 'function' || !item.name || !Array.isArray(item.inputs)) continue;
      // exact name match
      if (item.name === name) {
        const types = item.inputs.map((i) => i.type.trim());
        if (types.length === wantedTypes.length && types.every((t, i) => t === wantedTypes[i])) {
          return `${item.name}(${types.join(',')})`;
        }
      }
    }

    // fallback: case-insensitive name match
    for (const item of abis) {
      if (item.type !== 'function' || !item.name || !Array.isArray(item.inputs)) continue;
      if (item.name.toLowerCase() === name.toLowerCase()) {
        const types = item.inputs.map((i) => i.type.trim());
        if (types.length === wantedTypes.length && types.every((t, i) => t === wantedTypes[i])) {
          return `${item.name}(${types.join(',')})`;
        }
      }
    }

    return canonicalSig;
  }

  const resolved = resolveAgainstAbi(canonical);
  const hash = keccak256(toUtf8Bytes(resolved));
  return '0x' + hash.slice(2, 10);
}

// Turn any mix of {selectors: ['0x...'], signatures: ['fn(...)']} into a hex selector set
function manifestSelectorsToHex(manifestJson) {
  const hex = new Set();

  const isHexSelector = (s) => /^0x[0-9a-fA-F]{8}$/.test(String(s).trim());
  const push = (s) => hex.add(String(s).toLowerCase());
  const pushMaybeSig = (s) => {
    const t = String(s).trim();
    if (isHexSelector(t)) push(t);
    else push(sigToSelector(t));
  };
  const pushSig = (sig) => push(sigToSelector(sig));

  // combined file may carry at top-level and/or within parts[]
  if (Array.isArray(manifestJson.selectors)) {
    manifestJson.selectors.forEach((s) => pushMaybeSig(s));
  }
  if (Array.isArray(manifestJson.signatures)) {
    manifestJson.signatures.forEach((sig) => pushSig(sig));
  }
  if (Array.isArray(manifestJson.parts)) {
    for (const p of manifestJson.parts) {
      (p.selectors || []).forEach((s) => pushMaybeSig(s));
      (p.signatures || []).forEach((sig) => pushSig(sig));
    }
  }

  return hex;
}

// Extract hex selectors from compiled ABI array
function abiToSelectorsHex(abiArray) {
  const hex = new Set();
  for (const item of abiArray) {
    if (item.type === 'function' && item.name && Array.isArray(item.inputs)) {
      const sig = `${item.name}(${item.inputs.map((i) => i.type).join(',')})`;
      const sel = sigToSelector(sig);
      hex.add(sel.toLowerCase());
    }
  }
  return hex;
}

// Load combined.json from splitter
const manifestJson = JSON.parse(readFileSafely(COMBINED_PATH) || '{}');

const compiledSet = abiToSelectorsHex(abis);
const manifestSet = manifestSelectorsToHex(manifestJson);

// Diffs
const missingInManifest = [...compiledSet].filter((sel) => !manifestSet.has(sel));
const missingInAbi = [...manifestSet].filter((sel) => !compiledSet.has(sel));

const mode = (argv.mode || 'subset').toLowerCase();

// Report
console.log('\n— ABI Parity Check —');
console.log('Compiled selectors:', compiledSet.size);
console.log('Manifest selectors:', manifestSet.size);

if (mode === 'subset') {
  // We only care that everything in manifest exists in ABI
  if (missingInAbi.length === 0) {
    console.log('✅ ABI parity OK (subset mode)');
    process.exit(0);
  } else {
    console.log('\nMissing in ABI (present in manifest):');
    missingInAbi.forEach((s) => {
      const orig = manifestSet._orig && manifestSet._orig.get(s);
      if (orig) console.log(' ', s, '->', orig);
      else console.log(' ', s);
    });
    console.log('\n❌ ABI parity FAILED (subset mode)');
    process.exit(1);
  }
} else {
  // strict: sets must match exactly
  if (missingInAbi.length === 0 && missingInManifest.length === 0) {
    console.log('✅ ABI parity OK (strict)');
    process.exit(0);
  } else {
    if (missingInManifest.length) {
      console.log('\nMissing in manifest (present in ABI):');
      missingInManifest.forEach((s) => console.log(' ', s));
    }
    if (missingInAbi.length) {
      console.log('\nExtra in manifest (not in ABI):');
      missingInAbi.forEach((s) => console.log(' ', s));
    }
    console.log('\n❌ ABI parity FAILED (strict)');
    process.exit(1);
  }
}
