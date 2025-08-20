// tools/generate-manifest.js
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { keccak256, toUtf8Bytes } = require('ethers'); // v6

const ARTIFACTS_ROOT = path.join(process.cwd(), 'artifacts', 'contracts');
const OUT_MANIFEST = path.join(process.cwd(), 'payrox-manifest.json');
const OUT_SELECTOR_MAP = path.join(process.cwd(), 'selector_map.json');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function isFacetArtifact(art) {
  const src = art?.sourceName || '';
  const name = art?.contractName || '';
  // Only consider artifacts whose source file is under contracts/facets/
  const inFacetsFolder = src.startsWith('contracts/facets/') || src.includes('/facets/');
  // Try multiple artifact shapes for runtime bytecode
  const deployedA = art?.deployedBytecode; // some artifacts have a string here
  const deployedB = art?.deployedBytecode?.object; // some have object wrapper
  const deployedC = art?.evm?.deployedBytecode?.object; // older hh format
  const deployed = deployedA || deployedB || deployedC || '';
  const hasRuntime = typeof deployed === 'string' && deployed.length > 2 && deployed !== '0x';
  // Only include real, deployable facet contracts (skip interfaces, abstract contracts, libraries)
  return inFacetsFolder && hasRuntime && /Facet$/.test(name);
}

function typeFromAbi(input) {
  const t = input.type;
  if (!t.startsWith('tuple')) return t;
  const match = t.match(/^tuple(\[.*\])?$/);
  const arraySuffix = match && match[1] ? match[1] : '';
  const components = input.components || [];
  const inner = '(' + components.map(typeFromAbi).join(',') + ')';
  return inner + arraySuffix;
}

function funcSignature(item) {
  const name = item.name;
  const params = (item.inputs || []).map(typeFromAbi).join(',');
  return `${name}(${params})`;
}

function selector(sig) {
  return '0x' + keccak256(toUtf8Bytes(sig)).slice(2, 10);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (stat.isFile() && name.endsWith('.json')) out.push(full);
  }
  return out;
}

function collectFacetArtifacts() {
  const files = walk(ARTIFACTS_ROOT);
  const result = [];
  for (const f of files) {
    try {
      const art = readJSON(f);
      if (!art?.abi) continue;
      if (!isFacetArtifact(art)) continue;
      result.push({ file: f, art });
    } catch (_) { }
  }
  return result;
}

function buildManifest() {
  const artifacts = collectFacetArtifacts();
  if (artifacts.length === 0) {
    console.warn('⚠️  No facet artifacts found in', ARTIFACTS_ROOT);
  }

  const manifest = { version: "1.0.0", facets: {} };
  const selectorOwners = new Map();

  for (const { art } of artifacts) {
    const facetName = art.contractName;
    const funcs = art.abi.filter(i => i.type === 'function');
    const sels = new Set();

    for (const fn of funcs) {
      const sig = funcSignature(fn);
      const sel = selector(sig);
      sels.add(sel);

      if (!selectorOwners.has(sel)) selectorOwners.set(sel, []);
      selectorOwners.get(sel).push(facetName);
    }

    manifest.facets[facetName] = { selectors: Array.from(sels) };
  }

  const collisions = [];
  for (const [sel, owners] of selectorOwners.entries()) {
    if (owners.length > 1) collisions.push({ selector: sel, facets: owners });
  }
  if (collisions.length) {
    console.error('❌ Selector collisions detected:');
    for (const c of collisions) {
      console.error(`   ${c.selector} in facets: ${c.facets.join(', ')}`);
    }
    fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2));
    process.exit(2);
  }

  const selectorMap = {};
  for (const { art } of artifacts) {
    const facetName = art.contractName;
    for (const fn of art.abi.filter(i => i.type === 'function')) {
      const sig = funcSignature(fn);
      const sel = selector(sig);
      selectorMap[sel] = `${facetName}.${sig}`;
    }
  }

  fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(OUT_SELECTOR_MAP, JSON.stringify(selectorMap, null, 2));
  console.log(`✅ Wrote ${OUT_MANIFEST} and ${OUT_SELECTOR_MAP}`);
}

buildManifest();
