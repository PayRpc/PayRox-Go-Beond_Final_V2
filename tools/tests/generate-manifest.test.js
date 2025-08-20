const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const GEN = path.join(ROOT, 'tools', 'generate-manifest.js');
const TRIAGE = path.join(ROOT, 'tools', 'triage-collisions.js');
const MANIFEST = path.join(ROOT, 'payrox-manifest.json');

function run(cmd) {
  return execSync(cmd, { stdio: 'pipe' }).toString();
}

(async () => {
  console.log('Running manifest generator...');
  run(`node "${GEN}"`);

  assert.ok(fs.existsSync(MANIFEST), 'payrox-manifest.json must exist');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

  const facetNames = Object.keys(manifest.facets || {});
  console.log('Found facets:', facetNames.join(', '));

  // No interface names (starting with 'I')
  const bad = facetNames.filter(n => n.startsWith('I'));
  assert.strictEqual(bad.length, 0, `Manifest contains interface-like artifacts: ${bad.join(', ')}`);

  console.log('Running triage...');
  try {
    run(`node "${TRIAGE}"`);
  } catch (err) {
    // triage returns non-zero on collisions; capture output
    const out = (err.stdout || err.message || '').toString();
    throw new Error('Triage reported collisions:\n' + out);
  }

  console.log('Manifest & triage checks passed');
})();
