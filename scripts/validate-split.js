// scripts/validate-split.js
const fs = require('fs');
const path = require('path');

const OUT = path.resolve('artifacts/splits');
const combined = JSON.parse(fs.readFileSync(path.join(OUT, 'combined.json'), 'utf8'));

// Normalize legacy/alternate shapes: some manifests may store 'parts' as an array of part objects
// and 'selectors' as an array of selector strings. Normalize to numeric counts so validation is stable.
let partsCount = null;
let selectorsCount = null;
if (Array.isArray(combined.parts)) {
  partsCount = combined.parts.length;
} else if (Number.isInteger(combined.parts)) {
  partsCount = combined.parts;
}
if (Array.isArray(combined.selectors)) {
  selectorsCount = combined.selectors.length;
} else if (Number.isInteger(combined.selectors)) {
  selectorsCount = combined.selectors;
}
// If still null, try to derive from by_part or parts_list
if ((partsCount === null || partsCount === 0) && Array.isArray(combined.by_part)) {
  partsCount = combined.by_part.length;
}
if ((selectorsCount === null || selectorsCount === 0) && Array.isArray(combined.selectors_list)) {
  selectorsCount = combined.selectors_list.length;
}

// Basic invariants
if (!Number.isInteger(partsCount) || partsCount < 1) {
  throw new Error('No parts produced');
}
if (!Number.isInteger(selectorsCount) || selectorsCount < 1) {
  throw new Error('No selectors extracted');
}

// Per-part checks
const PAYROX_SAFE_FACET_SIZE = 22000; // bytes, soft ceiling under EIP-170
let anyFunctions = false;
for (let i = 0; i < combined.parts; i++) {
  const sol = path.join(OUT, `part_${i}.sol`);
  const json = path.join(OUT, `part_${i}.json`);
  if (!fs.existsSync(sol) || !fs.existsSync(json)) {
    throw new Error(`Missing outputs for part_${i}`);
  }
  const stat = fs.statSync(sol);
  if (stat.size > 24576) {
    throw new Error(`part_${i}.sol exceeds EIP-170 limit: ${stat.size} bytes`);
  }
  if (stat.size > PAYROX_SAFE_FACET_SIZE) {
    console.warn(`WARN: part_${i}.sol is large (${stat.size} bytes); consider splitting further`);
  }
  const meta = JSON.parse(fs.readFileSync(json, 'utf8'));
  if (Array.isArray(meta.selectors) && meta.selectors.length > 0) {
    anyFunctions = true;
  }
}

if (!anyFunctions) {
  throw new Error('All parts have zero selectors, which is unexpected.');
}

console.log(`OK: ${combined.parts} parts, ${combined.selectors} selectors`);
