const fs = require('fs');
const path = require('path');
const { keccak256, toUtf8Bytes } = require('ethers').utils || require('ethers');

const facetsDir = path.join(process.cwd(), 'contracts', 'facets');
const outPath = path.join(process.cwd(), 'payrox-manifest.json');

function computeSelector(signature) {
  // keccak256(signature) -> first 4 bytes (8 hex chars)
  const hash = keccak256(toUtf8Bytes(signature));
  return hash.slice(0, 10);
}

function extractParamTypes(paramStr) {
  if (!paramStr || paramStr.trim() === '') return [];
  // split on commas but ignore commas inside tuples (simple heuristic: assume no nested tuples used)
  const parts = paramStr.split(',').map(s => s.trim()).filter(Boolean);
  const modifiers = new Set(['memory','calldata','storage','indexed','internal','external','public','private','view','pure','returns','payable','virtual','override','unchecked','contract']);
  return parts.map(p => {
    // remove parameter comments
    p = p.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/g, '').trim();
    // remove multiple spaces
    p = p.replace(/\s+/g, ' ');
    const tokens = p.split(' ').filter(Boolean);
    // filter out known modifiers
    const filtered = tokens.filter(t => !modifiers.has(t));
    if (filtered.length === 0) return '';
    // If last token looks like an identifier (contains letters and not special chars) drop it
    const last = filtered[filtered.length - 1];
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(last) && filtered.length > 1) {
      filtered.pop();
    }
    return filtered.join(' ');
  }).map(s => s.trim());
}

function scanFacet(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const matches = [];
  const re = /function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    const params = m[2];
    // skip internal/private/internal functions by looking for keywords after the closing paren in a small window
    const after = src.substring(m.index, m.index + 200);
    if (/\b(private|internal)\b/.test(after)) continue; // prefer public/external
    // include if public or external or returns present or modifier not private/internal
    // We'll include most functions; the selector computation will be consistent
    const types = extractParamTypes(params).join(',');
    const signature = `${name}(${types})`;
    matches.push(signature);
  }
  return Array.from(new Set(matches));
}

function main() {
  if (!fs.existsSync(facetsDir)) {
    console.error('Facets dir not found:', facetsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(facetsDir).filter(f => f.endsWith('.sol'));
  const manifest = { version: '0.1.0', facets: {} };

  for (const f of files) {
    const filePath = path.join(facetsDir, f);
    const facetName = path.basename(f, '.sol');
    const signatures = scanFacet(filePath);
    const selectors = signatures.map(sig => computeSelector(sig));
    manifest.facets[facetName] = { selectors };
  }

  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log('Wrote manifest to', outPath);
  console.log(JSON.stringify(manifest, null, 2));
}

main();
