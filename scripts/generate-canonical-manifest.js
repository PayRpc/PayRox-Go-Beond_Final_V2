#!/usr/bin/env node
/**
 * scripts/generate-canonical-manifest.js
 *
 * Builds PayRox canonical manifest from splitter output (artifacts/splits/combined.json).
 * - Canonicalizes signatures -> selectors with keccak256(name(types))
 * - Filters to facet parts only (no interfaces/abstracts/libraries)
 * - Fails on implementation↔implementation selector collisions (unless --soft)
 * - Bans DiamondLoupe/admin selectors in facets
 * - Writes:
 *    - payrox-manifest.json (facet -> selectors[])
 *    - selector_map.json   (selector -> {facets[], signatures[]})
 *    - validation-report.md
 *
 * Flags:
 *  --combined/-c <path>      (default: artifacts/splits/combined.json)
 *  --out/-o <manifestPath>   (default: payrox-manifest.json)
 *  --map <selectorMapPath>   (default: selector_map.json)
 *  --report <reportPath>     (default: validation-report.md)
 *  --soft                    (do not exit non-zero on collisions/bans; print warnings)
 *
 * Why this is better (and compliant):
 *
 * - Uses canonical keccak256(toUtf8Bytes("name(types)")) (no SHA-256, no whitespace artifacts).
 * - Normalizes types (uint→uint256, arrays, strips param names, tuple component names).
 * - Skips non-facet files; bans loupe/admin selectors in facets.
 * - Fails build on collisions unless --soft is set.
 * - Emits selector_map.json and validation-report.md for CI artifacts.
 * - Reads version from PRX_VERSION or package.json.
 *
 * CI hook (example):
 *
 * node scripts/generate-canonical-manifest.js \
 *   --combined artifacts/splits/combined.json \
 *   --out payrox-manifest.json \
 *   --map selector_map.json \
 *   --report validation-report.md
 *
 * Wire that command into the PayRox Refactor Gate job.
 */
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const { keccak256, toUtf8Bytes } = require('ethers');

const argv = minimist(process.argv.slice(2), {
  string: ['combined', 'out', 'map', 'report'],
  boolean: ['soft'],
  alias: { c: 'combined', o: 'out' },
  default: {
    combined: 'artifacts/splits/combined.json',
    out: 'payrox-manifest.json',
    map: 'selector_map.json',
    report: 'validation-report.md',
  },
});

function fatal(msg, code = 1) {
  console.error('[manifest] ' + msg);
  process.exit(code);
}
function warn(msg) {
  console.warn('[manifest] ' + msg);
}

const combinedPath = path.resolve(argv.combined);
if (!fs.existsSync(combinedPath)) fatal('combined.json not found at ' + combinedPath);
let combined;
try {
  combined = JSON.parse(fs.readFileSync(combinedPath, 'utf8'));
} catch (e) {
  fatal('failed to parse combined.json: ' + e.message);
}
if (!Array.isArray(combined.parts) || combined.parts.length === 0)
  fatal('combined.parts empty or missing');

// ----- Canon helpers -----
const TYPE_ALIASES = new Map([
  ['uint', 'uint256'],
  ['int', 'int256'],
  ['byte', 'bytes1'],
]);

function canonicalizeType(t) {
  let x = String(t).trim();
  // strip spaces around array brackets
  x = x.replace(/\s*\[\s*\]/g, '[]');
  // map aliases (only head before any [] suffix)
  const m = x.match(/^([a-zA-Z0-9_]+)/);
  if (m) {
    const head = m[1];
    if (TYPE_ALIASES.has(head)) x = x.replace(head, TYPE_ALIASES.get(head));
  }
  // tuples are expected already canonical as tuple(<types>) per splitter;
  // if names present (tuple(uint a,uint b)), drop names:
  x = x.replace(/tuple\s*\((.*?)\)/g, (_, inner) => {
    const typesOnly = inner
      .split(',')
      .map((seg) => seg.trim().split(/\s+/)[0]) // keep first token = type
      .join(',');
    return `tuple(${typesOnly})`;
  });
  return x;
}

function canonicalizeSignature(sig) {
  // removes returns(...) and spaces, normalizes types
  // input may be like "transfer(address to, uint amount) returns (bool)"
  const raw = String(sig).trim();
  const fnMatch = raw.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)/);
  if (!fnMatch) fatal('bad signature: ' + sig);
  const name = fnMatch[1];
  const args = fnMatch[2] || '';
  const argTypes = args
    .split(',')
    .map((a) => a.trim())
    .filter((a) => a.length > 0)
    .map((a) => a.split(/\s+/)[0]) // drop param names
    .map(canonicalizeType)
    .join(',');
  return `${name}(${argTypes})`;
}

function selectorFromSignature(sig) {
  const canon = canonicalizeSignature(sig);
  // ethers keccak256(toUtf8Bytes(signature)) -> 0x...; slice first 10 chars
  return keccak256(toUtf8Bytes(canon)).slice(0, 10);
}

// Banned selectors (loupe/admin) — must NOT appear in facets
const BANNED_SIGS = [
  'diamondCut((address,uint8,bytes4[])[],address,bytes)', // 0x1f931c1c
  'facets()', // 0x7a0ed627 OR 0xcdffacc6 depending on variant; we compute exact
  'facetFunctionSelectors(address)',
  'facetAddresses()',
  'facetAddress(bytes4)',
  'supportsInterface(bytes4)', // centralized in ERC165Facet
];
const BANNED_SELECTORS = new Set(BANNED_SIGS.map(selectorFromSignature));

// Detect facet-like paths quickly
function isFacetFile(file) {
  const f = String(file || '').replace(/\\/g, '/');
  if (!f) return false;
  if (f.includes('/interfaces/') || f.includes('/abstract') || f.includes('/libraries/')) return false;
  if (f.includes('/facets/') || /Facet\.sol$/.test(f)) return true;
  return false;
}

// ----- Build data -----
const facets = {}; // facetName -> { selectors: Set<string>, signatures: Map<selector->string> }
const selectorOwners = new Map(); // selector -> { facets: Set<string>, signatures: Set<string> }

for (const part of combined.parts) {
  const file = part.file || part.name || '';
  if (!isFacetFile(file)) {
    // skip non-facets; keep combined.json clean
    continue;
  }
  const facetName = path.basename(file, '.sol');

  // Source may provide either signatures or precomputed selectors
  const sigs = Array.isArray(part.signatures) ? part.signatures : [];
  const givenSelectors = Array.isArray(part.selectors) ? part.selectors : [];

  // Prefer signatures (canonicalizable); else trust valid 0xdeadbeef
  let selectors = [];
  let sigBySel = new Map();

  if (sigs.length > 0) {
    for (const s of sigs) {
      const sel = selectorFromSignature(s);
      selectors.push(sel);
      sigBySel.set(sel, canonicalizeSignature(s));
    }
  } else if (givenSelectors.length > 0) {
    for (const selRaw of givenSelectors) {
      const sel = String(selRaw).toLowerCase();
      if (!/^0x[0-9a-f]{8}$/.test(sel)) fatal(`invalid selector in ${facetName}: ${selRaw}`);
      selectors.push(sel);
      // we may not know the signature here
    }
  } else {
    warn(`no signatures/selectors in part ${file}; skipping`);
    continue;
  }

  // init facet bucket
  if (!facets[facetName]) facets[facetName] = { selectors: new Set(), signatures: new Map() };

  // add selectors & ownership
  for (const sel of selectors) {
    facets[facetName].selectors.add(sel);
    const mapEntry = selectorOwners.get(sel) || { facets: new Set(), signatures: new Set() };
    mapEntry.facets.add(facetName);
    const sig = sigBySel.get(sel);
    if (sig) mapEntry.signatures.add(sig);
    selectorOwners.set(sel, mapEntry);
  }
}

// Deduplicate & sort per facet, produce manifest structure
const manifestFacets = {};
let totalSelectors = 0;
for (const [facetName, data] of Object.entries(facets)) {
  const list = Array.from(data.selectors).map((s) => s.toLowerCase());
  list.sort();
  manifestFacets[facetName] = { selectors: list };
  totalSelectors += list.length;
}

// Build selector map for diagnostics
const selectorMap = {};
for (const [sel, info] of selectorOwners.entries()) {
  selectorMap[sel] = {
    facets: Array.from(info.facets).sort(),
    signatures: Array.from(info.signatures).sort(),
  };
}

// Version
let version = '0.0.0';
try {
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
  version = process.env.PRX_VERSION || pkg.version || version;
} catch (_) {
  version = process.env.PRX_VERSION || version;
}

// Validation
const collisions = [];
const bannedHits = [];
for (const [sel, info] of Object.entries(selectorMap)) {
  if (info.facets.length > 1) collisions.push({ selector: sel, owners: info.facets });
  if (BANNED_SELECTORS.has(sel)) bannedHits.push(sel);
}

const reportLines = [];
reportLines.push('# PayRox Manifest Validation Report\n');
reportLines.push(`- Version: \`${version}\``);
reportLines.push(`- Facets: ${Object.keys(manifestFacets).length}`);
reportLines.push(`- Selectors: ${totalSelectors}`);
reportLines.push('');
if (collisions.length) {
  reportLines.push('## ❌ Selector Collisions');
  for (const c of collisions) {
    reportLines.push(`- \`${c.selector}\` owned by: ${c.owners.join(', ')}`);
  }
  reportLines.push('');
} else {
  reportLines.push('## ✅ No selector collisions detected\n');
}
if (bannedHits.length) {
  reportLines.push('## ❌ Banned selectors present in facets');
  for (const b of bannedHits) {
    reportLines.push(`- \`${b}\``);
  }
  reportLines.push('');
} else {
  reportLines.push('## ✅ No banned loupe/admin selectors in facets\n');
}

// Write outputs
const manifest = { version, facets: manifestFacets };
const outPath = path.resolve(argv.out);
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

const mapPath = path.resolve(argv.map);
fs.writeFileSync(mapPath, JSON.stringify(selectorMap, null, 2));

const reportPath = path.resolve(argv.report);
fs.writeFileSync(reportPath, reportLines.join('\n'));

console.log(
  `Canonical manifest written: ${outPath} (facets=${Object.keys(manifestFacets).length}, selectors=${totalSelectors})`
);
console.log(`Selector map written: ${mapPath}`);
console.log(`Validation report written: ${reportPath}`);

if (!argv.soft && (collisions.length || bannedHits.length)) {
  fatal('validation failed (collisions and/or banned selectors found)', 2);
}
