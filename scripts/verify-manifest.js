const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error('VERIFIER ERROR:', msg);
  process.exit(2);
}

const mf = path.resolve('./manifests/cross-network-registry.json');
if (!fs.existsSync(mf)) fail('manifest not found: ' + mf);
const raw = fs.readFileSync(mf, 'utf8');
let j;
try {
  j = JSON.parse(raw);
} catch (e) {
  fail('manifest not valid JSON');
}

// Basic checks
if (!j.initCodeHashes || !j.salts) fail('missing hashes or salts');
if (!Array.isArray(j.networks) || j.networks.length === 0) fail('no networks');
if (j.statistics && j.statistics.consistentTarget !== undefined) {
  if (!j.statistics.consistentTarget) fail('invariant: targets inconsistent across networks');
}
console.log('manifest verifier: OK');
process.exit(0);
