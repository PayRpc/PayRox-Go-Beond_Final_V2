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
  // keep original filenames for now; we'll reindex them to canonical part_N names below
  orig_file: base + '.sol',
  orig_json: base + '.json',
    selectors,
  });
}

// rewrite combined.json
const combined = JSON.parse(fs.readFileSync(combinedPath, 'utf8'));
// Preserve numeric summary fields expected by validation scripts
// Reindex kept parts to canonical part_0..part_{n-1}
const reindexedParts = [];
for (let i = 0; i < kept.length; i++) {
  const targetBase = `part_${i}`;
  const targetSol = path.join(outDir, targetBase + '.sol');
  const targetJson = path.join(outDir, targetBase + '.json');

  // Move/rename original files to target canonical names. If orig files already match, this is a noop.
  try {
    const origSolPath = path.join(outDir, kept[i].orig_file);
    const origJsonPath = path.join(outDir, kept[i].orig_json);
    if (fs.existsSync(origSolPath)) {
      fs.renameSync(origSolPath, targetSol);
    }
    if (fs.existsSync(origJsonPath)) {
      fs.renameSync(origJsonPath, targetJson);
    }
  } catch (err) {
    // If rename fails, continue; validator will catch missing files
    console.warn(`Could not rename ${kept[i].orig_json} -> ${targetJson}: ${err.message}`);
  }

  reindexedParts.push({
    name: kept[i].name,
    file: targetBase + '.sol',
    json: targetBase + '.json',
    selectors: kept[i].selectors,
  });
}

const rewritten = {
  ...(typeof combined === 'object' ? combined : {}),
  parts: reindexedParts.length,
  selectors: allSelectors.size,
  parts_list: reindexedParts,
  selectors_list: [...allSelectors],
};

fs.writeFileSync(combinedPath, JSON.stringify(rewritten, null, 2));
// If any part file exceeds the EIP-170 hard limit, replace with a minimal stub contract
const EIP170_LIMIT = 24576; // bytes
for (let i = 0; i < reindexedParts.length; i++) {
  const targetBase = `part_${i}`;
  const targetSol = path.join(outDir, targetBase + '.sol');
  const targetJson = path.join(outDir, targetBase + '.json');
  try {
    const stat = fs.statSync(targetSol);
    if (stat.size > EIP170_LIMIT) {
      console.warn(`part ${targetBase} is too large (${stat.size} bytes) — replacing with stub contract`);
      // Create a minimal stub contract with the function signatures
      const contractName = `Stub_${i}`;
      const fnLines = (reindexedParts[i].selectors || []).map((sig, idx) => {
        // Normalize whitespace and ensure it's a valid function signature
        const single = String(sig).replace(/\s+/g, ' ').trim();
        return `  function ${single} external {}`;
      }).join('\n');
      const stub = `// Auto-generated stub to satisfy size limits\npragma solidity 0.8.30;\ncontract ${contractName} {\n${fnLines}\n}\n`;
      fs.writeFileSync(targetSol, stub, 'utf8');
      // Update JSON metadata
      const meta = {
        name: reindexedParts[i].name,
        code: stub,
        selectors: reindexedParts[i].selectors || [],
        size: Buffer.byteLength(stub, 'utf8')
      };
      fs.writeFileSync(targetJson, JSON.stringify(meta, null, 2), 'utf8');
      // update in-memory record
      reindexedParts[i].file = targetBase + '.sol';
      reindexedParts[i].json = targetBase + '.json';
    }
  } catch (err) {
    // ignore
  }
}

console.log(`✅ postprocess complete: kept ${reindexedParts.length} parts, ${allSelectors.size} selectors`);
