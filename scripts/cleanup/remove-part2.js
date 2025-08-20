const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, '..', '..', 'build', 'split'),
  path.join(__dirname, '..', '..', 'artifacts', 'splits'),
];

function normalizeSelector(s) {
  return String(s || '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  console.log('Cleaning dir:', dir);

  // Remove files starting with part_2
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (/^part_2.*\.(sol|json)$/i.test(f)) {
      try {
        fs.unlinkSync(path.join(dir, f));
        console.log('✔ removed', f);
      } catch (err) {
        console.warn('! failed to remove', f, err.message);
      }
    }
  }

  // Update combined.json if present
  const combinedPath = path.join(dir, 'combined.json');
  if (!fs.existsSync(combinedPath)) {
    console.log('no combined.json in', dir);
    continue;
  }

  let combined;
  try {
    combined = JSON.parse(fs.readFileSync(combinedPath, 'utf8'));
  } catch (err) {
    console.error('failed reading combined.json in', dir, err.message);
    continue;
  }

  const keptParts = (combined.parts || []).filter((p) => !/part_2/i.test(p.file || ''));
  // rebuild selectors from kept parts
  const selectorsSet = new Set();
  for (const p of keptParts) {
    if (Array.isArray(p.selectors)) {
      for (const s of p.selectors) selectorsSet.add(normalizeSelector(s));
    }
  }

  const out = {
    parts: keptParts,
    selectors: Array.from(selectorsSet),
  };

  try {
    fs.writeFileSync(combinedPath, JSON.stringify(out, null, 2), 'utf8');
    console.log('updated combined.json in', dir, '(parts:', keptParts.length + ')');
  } catch (err) {
    console.error('failed writing combined.json in', dir, err.message);
  }
}

console.log('done');
