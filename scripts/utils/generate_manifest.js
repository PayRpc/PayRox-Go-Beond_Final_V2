const fs = require('fs');
const path = require('path');
const ethers = require('ethers');

const refPath = path.join('contracts', 'Tests', 'Test.refactor.json');
const outPath = path.join('contracts', 'Tests', 'Test.manifest.json');

if (!fs.existsSync(refPath)) {
  console.error('Refactor file not found:', refPath);
  process.exit(2);
}
const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
const chunks = ref.chunks || [];

// Find cleaned facet files in the same folder
const dir = path.join('contracts', 'Tests');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.cleaned.facet.sol'));

const manifest = {
  contract: 'Test',
  generatedAt: new Date().toISOString(),
  facets: [],
};

for (const c of chunks) {
  // attempt to choose facet file that matches chunk id
  const prefer = files.find((f) => f.includes(c.id)) || files[0] || null;
  const facetEntry = {
    file: prefer || `UNKNOWN-${c.id}.facet.sol`,
    chunkId: c.id,
    functions: [],
  };
  for (let s of c.functions) {
    const norm = s
      .replace(/address payable/g, 'address')
      .replace(/\s+(calldata|memory)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const hash = ethers.id(norm);
    const selector = '0x' + hash.slice(2, 10);
    // derive simple name
    const name = norm.split('(')[0];
    facetEntry.functions.push({ name, signature: norm, selector, path: `/${name}` });
  }
  manifest.facets.push(facetEntry);
}

fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log('Wrote manifest:', outPath);
