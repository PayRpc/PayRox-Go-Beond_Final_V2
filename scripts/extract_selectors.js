const fs = require('fs');
const path = require('path');
const { keccak_256 } = require('js-sha3');

const SPLIT_DIR = path.join(__dirname, '..', 'artifacts', 'splits');
const OUT_DIR = path.join(__dirname, '..', 'artifacts', 'manifests');
fs.mkdirSync(OUT_DIR, { recursive: true });
const files = fs
  .readdirSync(SPLIT_DIR)
  .filter((f) => f.endsWith('.sol'))
  .sort();
const combined = [];

for (const f of files) {
  const fp = path.join(SPLIT_DIR, f);
  const src = fs.readFileSync(fp, 'utf8');
  // match public or external functions (simple heuristic)
  const regex = /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*(?:public|external)\b/gms;
  const selectors = [];
  const signatures = [];
  let m;

  function normParam(p) {
    let s = p
      .trim()
      .replace(/\b(memory|calldata|storage)\b/g, '')
      .replace(/\baddress\s+payable\b/g, 'address')
      .replace(/\s+/g, ' ')
      .trim();
    const toks = s.split(' ');
    if (toks.length > 1 && /^[A-Za-z_]\w*$/.test(toks[toks.length - 1])) toks.pop();
    return toks.join(' ');
  }

  while ((m = regex.exec(src))) {
    const name = m[1];
    const raw = m[2].trim();
    const params = raw.length
      ? raw
          .split(',')
          .map(normParam)
          .filter((x) => x.length > 0)
      : [];
    const sig = `${name}(${params.join(',')})`;
    signatures.push(sig);
    selectors.push('0x' + keccak_256(sig).slice(0, 8));
  }

  const manifest = { file: f, size: Buffer.byteLength(src, 'utf8'), selectors, signatures };
  fs.writeFileSync(
    path.join(OUT_DIR, f.replace('.sol', '.json')),
    JSON.stringify(manifest, null, 2),
  );
  combined.push(manifest);
  console.log('Manifest:', f, 'functions=', signatures.length);
}

fs.writeFileSync(path.join(OUT_DIR, 'combined.json'), JSON.stringify({ parts: combined }, null, 2));
console.log('Wrote combined manifest to', path.join(OUT_DIR, 'combined.json'));
