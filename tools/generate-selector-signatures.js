const fs = require('fs');
const path = require('path');
const { keccak256, toUtf8Bytes } = require('ethers').utils || require('ethers');

function computeSelector(signature) {
  const hash = keccak256(toUtf8Bytes(signature));
  return hash.slice(0, 10);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && e.name.endsWith('.json')) out.push(full);
  }
  return out;
}

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'payrox-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('payrox-manifest.json not found in', repoRoot);
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const selectorToFacets = {};
for (const [facet, meta] of Object.entries(manifest.facets || {})) {
  for (const sel of meta.selectors || []) {
    selectorToFacets[sel] = selectorToFacets[sel] || [];
    selectorToFacets[sel].push(facet);
  }
}

// find colliding selectors from manifest (count > 1)
const collidingSelectors = Object.entries(selectorToFacets)
  .filter(([, facets]) => facets.length > 1)
  .map(([sel]) => sel);

const artifactsDir = path.join(repoRoot, 'artifacts');
const artifactFiles = walk(artifactsDir);

const report = { generated: new Date().toISOString(), collidingSelectors: {} };
for (const sel of collidingSelectors) report.collidingSelectors[sel] = { facets: selectorToFacets[sel], occurrences: [] };

for (const file of artifactFiles) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(raw);
    const abi = json.abi || json.output?.abi || null;
    const contractName = json.contractName || path.basename(file, '.json');
    if (!Array.isArray(abi)) continue;
    for (const item of abi) {
      if (item.type !== 'function') continue;
      const inputs = (item.inputs || []).map(i => i.type).join(',');
      const signature = `${item.name}(${inputs})`;
      const selector = computeSelector(signature);
      if (report.collidingSelectors[selector]) {
        report.collidingSelectors[selector].occurrences.push({
          artifact: path.relative(repoRoot, file),
          contractName,
          signature,
        });
      }
    }
  } catch (err) {
    // ignore parse errors
  }
}

// write JSON and a small markdown summary
const outJson = path.join(repoRoot, 'reports', 'selector-collision-detail.json');
fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');

const mdLines = [];
mdLines.push('# Selector collision detail');
mdLines.push('Generated: ' + new Date().toISOString());
mdLines.push('');
for (const [sel, data] of Object.entries(report.collidingSelectors)) {
  mdLines.push(`## ${sel}`);
  mdLines.push(`Facets: ${data.facets.join(', ')}`);
  if (data.occurrences.length === 0) {
    mdLines.push('- No matching ABI occurrences found in artifacts/ (manifest may be out of sync)');
  } else {
    mdLines.push('- Occurrences:');
    for (const occ of data.occurrences) {
      mdLines.push(`  - ${occ.contractName} @ ${occ.artifact}  -> ${occ.signature}`);
    }
  }
  mdLines.push('');
}
const outMd = path.join(repoRoot, 'reports', 'selector-collision-detail.md');
fs.writeFileSync(outMd, mdLines.join('\n'), 'utf8');

console.log('Wrote', outJson, 'and', outMd);
