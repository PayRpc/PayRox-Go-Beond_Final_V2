#!/usr/bin/env node
/*
 * scripts/diagnose-manifest-mismatch.js
 * Produce a diagnostic JSON and console output when ABI/manifest parity fails.
 * Usage: node scripts/diagnose-manifest-mismatch.js --source <file.sol> --combined <manifest.json>
 */
const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { keccak256, toUtf8Bytes } = require('ethers');
const argv = require('minimist')(process.argv.slice(2), {
  string: ['source', 'combined'],
  alias: { s: 'source', c: 'combined' },
});

if (!argv.source || !argv.combined) {
  console.error(
    'Usage: node scripts/diagnose-manifest-mismatch.js --source <file.sol> --combined <manifest.json>',
  );
  process.exit(2);
}

function readFileSafely(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

const SOURCE_PATH = path.resolve(argv.source);
const COMBINED_PATH = path.resolve(argv.combined);

function findImports(importPath) {
  const rel = path.resolve(path.dirname(SOURCE_PATH), importPath);
  let contents = readFileSafely(rel);
  if (contents !== null) return { contents };
  const contractsRel = path.resolve(process.cwd(), 'contracts', importPath);
  contents = readFileSafely(contractsRel);
  if (contents !== null) return { contents };
  const rootRel = path.resolve(process.cwd(), importPath);
  contents = readFileSafely(rootRel);
  if (contents !== null) return { contents };
  const nm = path.resolve(process.cwd(), 'node_modules', importPath);
  contents = readFileSafely(nm);
  if (contents !== null) return { contents };
  return { error: 'File not found: ' + importPath };
}

// compile source
const input = {
  language: 'Solidity',
  sources: { [path.basename(SOURCE_PATH)]: { content: readFileSafely(SOURCE_PATH) } },
  settings: { outputSelection: { '*': { '*': ['abi'] } } },
};
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === 'error');
  fatal.forEach((e) => console.error(e.formattedMessage || e.message));
  if (fatal.length) process.exit(1);
}

const abis = [];
for (const file of Object.keys(output.contracts || {})) {
  for (const contract of Object.keys(output.contracts[file] || {})) {
    const c = output.contracts[file][contract];
    if (c.abi) abis.push(...c.abi);
  }
}

function normalizeSignature(sig) {
  const s = String(sig).trim();
  const m = s.match(/^([^()]+)\(([\n\s\S]*)\)$/);
  if (!m) return s.replace(/\s+/g, '');
  const name = m[1].trim();
  const inner = m[2].trim();
  if (inner === '') return `${name}()`;
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
    } else cur += ch;
  }
  if (cur) parts.push(cur);
  const types = parts.map((p) => {
    const tok = p.trim().split(/\s+/)[0] || '';
    return tok.trim();
  });
  return `${name}(${types.join(',')})`;
}

function sigToSelector(sig) {
  const canonical = normalizeSignature(sig);
  function resolveAgainstAbi(canonicalSig) {
    const m = canonicalSig.match(/^([^()]+)\((.*)\)$/);
    if (!m) return canonicalSig;
    const name = m[1];
    const inner = m[2];
    const wantedTypes = inner === '' ? [] : inner.split(',').map((t) => t.trim());
    for (const item of abis) {
      if (item.type !== 'function' || !item.name || !Array.isArray(item.inputs)) continue;
      if (item.name === name) {
        const types = item.inputs.map((i) => i.type.trim());
        if (types.length === wantedTypes.length && types.every((t, i) => t === wantedTypes[i]))
          return `${item.name}(${types.join(',')})`;
      }
    }
    for (const item of abis) {
      if (item.type !== 'function' || !item.name || !Array.isArray(item.inputs)) continue;
      if (item.name.toLowerCase() === name.toLowerCase()) {
        const types = item.inputs.map((i) => i.type.trim());
        if (types.length === wantedTypes.length && types.every((t, i) => t === wantedTypes[i]))
          return `${item.name}(${types.join(',')})`;
      }
    }
    return canonicalSig;
  }
  const resolved = resolveAgainstAbi(canonical);
  const hash = keccak256(toUtf8Bytes(resolved));
  return '0x' + hash.slice(2, 10);
}

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
  if (!manifestJson) return hex;
  if (manifestJson.facets && typeof manifestJson.facets === 'object') {
    for (const f of Object.values(manifestJson.facets)) {
      const sels = f && f.selectors ? f.selectors : [];
      for (const s of sels) pushMaybeSig(s);
    }
    return hex;
  }
  if (Array.isArray(manifestJson.selectors)) manifestJson.selectors.forEach((s) => pushMaybeSig(s));
  if (Array.isArray(manifestJson.signatures))
    manifestJson.signatures.forEach((sig) => pushSig(sig));
  if (Array.isArray(manifestJson.parts))
    for (const p of manifestJson.parts) {
      (p.selectors || []).forEach((s) => pushMaybeSig(s));
      (p.signatures || []).forEach((sig) => pushSig(sig));
    }
  return hex;
}

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

const manifestJson = JSON.parse(readFileSafely(COMBINED_PATH) || '{}');
const compiledSet = abiToSelectorsHex(abis);
const manifestSet = manifestSelectorsToHex(manifestJson);

const missingInManifest = [...compiledSet].filter((sel) => !manifestSet.has(sel));
const missingInAbi = [...manifestSet].filter((sel) => !compiledSet.has(sel));

const report = {
  compiled: [...compiledSet].sort(),
  manifest: [...manifestSet].sort(),
  missingInManifest,
  missingInAbi,
};
const outDir = path.resolve('artifacts', 'diagnostics');
try {
  fs.mkdirSync(outDir, { recursive: true });
} catch {}
const outPath = path.join(outDir, 'manifest-diff.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log('\n--- Manifest vs ABI diagnostic ---');
console.log('Compiled selectors:', compiledSet.size);
console.log('Manifest selectors:', manifestSet.size);
if (missingInManifest.length) {
  console.error('\nMissing in manifest (present in ABI):', missingInManifest.length);
  missingInManifest.slice(0, 50).forEach((s) => console.error('  ', s));
}
if (missingInAbi.length) {
  console.error('\nExtra in manifest (not in ABI):', missingInAbi.length);
  missingInAbi.slice(0, 50).forEach((s) => console.error('  ', s));
}

console.log(`\nDiagnostic written: ${outPath}`);

// Exit non-zero if there are differences
if (missingInManifest.length || missingInAbi.length) process.exit(1);
process.exit(0);
