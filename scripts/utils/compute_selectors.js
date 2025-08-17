const fs = require('fs');
const ethers = require('ethers');

const refPath = 'contracts/Tests/Test.refactor.json';
if (!fs.existsSync(refPath)) {
  console.error('Refactor file not found:', refPath);
  process.exit(2);
}
const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
const chunks = ref.chunks || [];
const sigs = [];
for (const c of chunks) {
  for (let s of c.functions) {
    // Normalize: remove 'payable' qualifier, calldata/memory, and extra spaces
    s = s.replace(/address payable/g, 'address');
    s = s.replace(/\s+(calldata|memory)\b/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    sigs.push(s);
  }
}
const out = {};
for (const s of sigs) {
  const hash = ethers.id(s);
  out[s] = '0x' + hash.slice(2, 10);
}
console.log(JSON.stringify(out, null, 2));
