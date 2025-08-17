#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2), {
  string: ['dir'],
  alias: { d: 'dir' },
  default: { dir: 'artifacts/splits' },
});

const outDir = path.resolve(argv.dir);
if (!fs.existsSync(outDir)) {
  console.error(`Output dir not found: ${outDir}`);
  process.exit(2);
}

const combinedPath = path.join(outDir, 'combined.json');
if (!fs.existsSync(combinedPath)) {
  console.error(`combined.json not found in ${outDir}`);
  process.exit(1);
}

const parts = fs
  .readdirSync(outDir)
  .filter((f) => /^part_\d+\.json$/i.test(f))
  .map((f) => path.join(outDir, f));

let kept = [];
let allSelectors = new Set();

for (const jsonFile of parts) {
  const base = path.basename(jsonFile, '.json');
  const solFile = path.join(outDir, base + '.sol');
  const info = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const selectors = Array.isArray(info.selectors) ? info.selectors : [];

  if (selectors.length === 0) {
    // delete empty part files
    try {
      fs.unlinkSync(jsonFile);
    } catch {
      // Ignore deletion errors
    }
    try {
      fs.unlinkSync(solFile);
    } catch {
      // Ignore deletion errors
    }
    console.log(`🧹 removed empty ${base}.{sol,json}`);
    continue;
  }

  selectors.forEach((s) => allSelectors.add(String(s).toLowerCase()));
  kept.push({
    name: info.name || base,
    file: base + '.sol',
    json: base + '.json',
    selectors,
  });
}

// rewrite combined.json
const combined = JSON.parse(fs.readFileSync(combinedPath, 'utf8'));
const rewritten = {
  ...(typeof combined === 'object' ? combined : {}),
  parts: kept,
  selectors: [...allSelectors],
};

fs.writeFileSync(combinedPath, JSON.stringify(rewritten, null, 2));
console.log(`✅ postprocess complete: kept ${kept.length} parts, ${allSelectors.size} selectors`);
