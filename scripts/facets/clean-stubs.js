#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function (file) {
    const fp = path.join(dir, file);
    const stat = fs.statSync(fp);
    if (stat && stat.isDirectory()) {
      results.push(...walk(fp));
    } else {
      results.push(fp);
    }
  });
  return results;
}

function sanitizeName(s) {
  return s.replace(/[^A-Za-z0-9_]/g, '_');
}

function extractFunctionNames(src) {
  const fnNames = [];
  const re = /^\s*function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*[^;{]*[;{]?/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    fnNames.push(m[1]);
  }
  return Array.from(new Set(fnNames));
}

function makeContract(name, functions) {
  const header = `// SPDX-License-Identifier: UNLICENSED\npragma solidity 0.8.30;\n\n// Auto-generated facet wrapper (cleaned)\ncontract ${name} {\n`;
  const body = functions
    .map((fn) => `  function ${fn}() external pure { revert("stub: ${fn}"); }\n`)
    .join('\n');
  const footer = `}\n`;
  return header + body + footer;
}

(function main() {
  const root = path.resolve(process.cwd(), 'contracts');
  if (!fs.existsSync(root)) {
    console.error('contracts directory not found');
    process.exit(2);
  }

  const files = walk(root).filter((f) => f.endsWith('.facet.sol'));
  if (files.length === 0) {
    console.log('No .facet.sol stub files found under contracts/');
    return;
  }

  const created = [];
  for (const f of files) {
    try {
      const src = fs.readFileSync(f, 'utf8');
      const fnNames = extractFunctionNames(src);
      if (fnNames.length === 0) {
        console.log(`Skipping ${f}: no functions found`);
        continue;
      }

      const base = path.basename(f, '.facet.sol');
      const sanitized = sanitizeName(base);
      const contractName = `${sanitized}_Facet`;
      const out = makeContract(contractName, fnNames);
      const outPath = path.join(path.dirname(f), `${base}.cleaned.facet.sol`);
      fs.writeFileSync(outPath, out, 'utf8');
      console.log(`Wrote cleaned facet: ${outPath}`);
      created.push(outPath);
    } catch (err) {
      console.error(`Failed processing ${f}:`, err && err.message ? err.message : err);
    }
  }

  console.log(`Done. Created ${created.length} cleaned facet(s).`);
})();
