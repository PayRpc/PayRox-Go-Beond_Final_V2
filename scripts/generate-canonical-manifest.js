#!/usr/bin/env node
/*
 * scripts/generate-canonical-manifest.js
 * Derives a canonical payrox-manifest.json from artifacts/splits/combined.json
 * - Converts function signatures to 4-byte selectors (keccak256)
 * - Groups by part (facet) filename
 * - Deduplicates & sorts selectors per facet and globally
 * - Writes manifest to project root unless --out specified
 */
const fs = require('fs');
const path = require('path');
const { keccak_256 } = require('js-sha3');
const argv = require('minimist')(process.argv.slice(2), {
  string: ['combined', 'out'],
  alias: { c: 'combined', o: 'out' },
  default: { combined: 'artifacts/splits/combined.json', out: 'payrox-manifest.json' },
});

function fatal(msg, code = 1) {
  console.error('[manifest] ' + msg);
  process.exit(code);
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

function normalizeSignature(sig) {
  return String(sig).replace(/\s+/g, ' ').trim();
}
function sigToSelector(sig) {
  const norm = normalizeSignature(sig);
  return '0x' + keccak_256(norm).slice(0, 8);
}

const facets = {};
for (const part of combined.parts) {
  const file = part.file || part.name || 'unknown';
  const facetName = file.replace(/\.sol$/, '');
  const sigs = Array.isArray(part.selectors) ? part.selectors : [];
  if (!facets[facetName]) facets[facetName] = { selectors: [] };
  for (const sig of sigs) {
    const sel = sigToSelector(sig);
    facets[facetName].selectors.push(sel);
  }
}

// Deduplicate & sort selectors per facet
let total = 0;
for (const f of Object.keys(facets)) {
  const uniq = [...new Set(facets[f].selectors.map((s) => s.toLowerCase()))];
  uniq.sort();
  facets[f].selectors = uniq;
  total += uniq.length;
}

const manifest = { version: '1.0.0', facets };
const outPath = path.resolve(argv.out);
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(
  `Canonical manifest written: ${outPath} (facets=${Object.keys(facets).length}, selectors=${total})`,
);
