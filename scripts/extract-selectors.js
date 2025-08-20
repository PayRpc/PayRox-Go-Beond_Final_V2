#!/usr/bin/env node
/**
 * Extract selectors from:
 *  - solc ABI for the original file (ground truth, handles tuples/structs)
 *  - regex scan of each split part for per-part manifests
 * Compares parts against ABI set and can fail CI on mismatch.
 */
const fs = require('fs');
const path = require('path');
const { keccak_256 } = require('js-sha3');
const solc = require('solc');

function arg(name, def) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx > -1 ? process.argv[idx + 1] : def;
}

const SRC_FILE = arg('source');
const SPLIT_DIR = arg('splits', 'artifacts/splits');
const OUT_DIR = arg('out', 'artifacts/manifests');
const EXPECTED = arg('expected');

if (!SRC_FILE) {
  console.error('Missing --source <file.sol>');
  process.exit(2);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

/* ---------- helpers ---------- */
function renderParamType(t) {
  const ty = t.type;
  if (ty.startsWith('tuple')) {
    const suffix = ty.slice('tuple'.length);
    const inner = (t.components || []).map(renderParamType).join(',');
    return `(${inner})${suffix}`;
  }
  return ty;
}
function funcSigFromAbiItem(item) {
  const params = (item.inputs || []).map(renderParamType).join(',');
  return `${item.name}(${params})`;
}
function selectorOf(sig) {
  return '0x' + keccak_256(sig).slice(0, 8);
}

function normParam(p) {
  let s = p
    .trim()
    .replace(/\b(memory|calldata|storage)\b/g, '')
    .replace(/\baddress\s+payable\b/g, 'address')
    .replace(/\s+/g, ' ')
    .trim();
  const toks = s.split(' ');
  if (toks.length > 1 && /^[A-Za-z_]\w*$/.test(toks[toks.length - 1])) toks.pop();
  return toks.join(' ');
}

/* ---------- compile original to get ABI-accurate function set ---------- */
const sourceContent = fs.readFileSync(SRC_FILE, 'utf8');
const stdInput = {
  language: 'Solidity',
  sources: { [path.basename(SRC_FILE)]: { content: sourceContent } },
  settings: { outputSelection: { '*': { '*': ['abi'] } } },
};
const solcOutput = JSON.parse(solc.compile(JSON.stringify(stdInput)));
if (solcOutput.errors && solcOutput.errors.some((e) => e.severity === 'error')) {
  console.error('solc errors:\n', solcOutput.errors.map((e) => e.formattedMessage).join('\n'));
  process.exit(1);
}

const contracts = solcOutput.contracts[path.basename(SRC_FILE)] || {};
const abiSignatures = [];
Object.entries(contracts).forEach(([, cobj]) => {
  (cobj.abi || []).forEach((item) => {
    if (item.type === 'function' && item.name) {
      abiSignatures.push(funcSigFromAbiItem(item));
    }
  });
});

const abiSelectorSet = new Set(abiSignatures.map(selectorOf));

/* ---------- parse splits (regex) for per-part manifests ---------- */
const files = fs
  .readdirSync(SPLIT_DIR)
  .filter((f) => f.endsWith('.sol'))
  .sort((a, b) => a.localeCompare(b));

const partManifests = [];
let totalMismatches = 0;

for (const f of files) {
  const fp = path.join(SPLIT_DIR, f);
  const src = fs.readFileSync(fp, 'utf8');

  const re = /function\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:external|public)/gms;

  const signatures = [];
  const selectors = [];
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    const raw = m[2].trim();
    const params = raw.length ? raw.split(',').map(normParam) : [];
    const sig = `${name}(${params.join(',')})`;
    signatures.push(sig);
    selectors.push(selectorOf(sig));
  }

  const mismatches = selectors.filter((sel) => !abiSelectorSet.has(sel));
  totalMismatches += mismatches.length;

  const manifest = {
    file: f,
    size: Buffer.byteLength(src, 'utf8'),
    functions: signatures.length,
    selectors,
    signatures,
    mismatches,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, f.replace('.sol', '.json')),
    JSON.stringify(manifest, null, 2),
  );
  partManifests.push(manifest);
  console.log(`Manifest ${f}: functions=${signatures.length} mismatches=${mismatches.length}`);
}

const combined = { parts: partManifests };
const combinedPath = path.join(OUT_DIR, 'combined.json');
fs.writeFileSync(combinedPath, JSON.stringify(combined, null, 2));
console.log('Wrote combined manifest to', combinedPath);

if (EXPECTED && fs.existsSync(EXPECTED)) {
  try {
    const exp = JSON.parse(fs.readFileSync(EXPECTED, 'utf8'));
    const expectedSelectors = new Set(
      Array.isArray(exp.selectors)
        ? exp.selectors
        : Array.isArray(exp.parts)
          ? exp.parts.flatMap((p) => p.selectors || [])
          : [],
    );
    const gotSelectors = new Set(partManifests.flatMap((p) => p.selectors));
    const missing = [...expectedSelectors].filter((s) => !gotSelectors.has(s));
    const extra = [...gotSelectors].filter((s) => !expectedSelectors.has(s));

    if (missing.length || extra.length || totalMismatches) {
      console.error('Selector compare FAILED');
      console.error('  missing (expected→not present):', missing);
      console.error('  extra (present→not expected):', extra);
      console.error('  regex/abi mismatches in parts  :', totalMismatches);
      process.exit(1);
    } else {
      console.log('Selector compare ✓ OK');
    }
  } catch (e) {
    console.error('Failed to read/compare expected manifest:', e.message);
    process.exit(1);
  }
}

if (totalMismatches) {
  console.error(
    `Warning: ${totalMismatches} selector(s) in split parts did not match ABI (regex limitations).`,
  );
}
