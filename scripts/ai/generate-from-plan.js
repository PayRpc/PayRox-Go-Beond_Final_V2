#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { utils } = require('ethers'); // ethers@5

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function buildSelectorMap(artifactsDir) {
  const files = globSync(path.join(artifactsDir, '**/*.json'));
  const map = new Map(); // selector => {name, inputs, outputs}
  for (const f of files) {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      const abi = j.abi || [];
      for (const item of abi) {
        if (item.type !== 'function') continue;
        const sig = `${item.name}(${(item.inputs || []).map((i) => i.type).join(',')})`;
        const selector = utils.keccak256(utils.toUtf8Bytes(sig)).slice(0, 10);
        map.set(selector, {
          name: item.name,
          inputs: item.inputs || [],
          outputs: item.outputs || [],
        });
      }
    } catch {
      // ignore malformed artifact JSON
    }
  }
  return map;
}

function paramList(inputs) {
  return inputs
    .map((i, _i) => `${i.type} ${i.name && i.name.trim() ? i.name : `p${_i}`}`)
    .join(', ');
}
function returnList(outputs) {
  if (!outputs || outputs.length === 0) return '';
  return (
    ' returns (' + outputs.map((o) => `${o.type}${o.name ? ` ${o.name}` : ''}`).join(', ') + ')'
  );
}

function genFacet(facetName, entries) {
  const iface = entries
    .map((e) => `    function ${e.name}(${paramList(e.inputs)}) external${returnList(e.outputs)};`)
    .join('\n');
  const impl = entries
    .map((e) => {
      const r = returnList(e.outputs);
      const needsReturn = e.outputs && e.outputs.length > 0;
      const retZero = needsReturn
        ? '(' +
          e.outputs
            .map((o) => {
              // try to return typed zeros
              if (o.type.endsWith(']')) return 'new ' + o.type; // fallback
              if (o.type.startsWith('uint') || o.type.startsWith('int')) return '0';
              if (o.type === 'bool') return 'false';
              if (o.type === 'address') return 'address(0)';
              if (o.type.startsWith('bytes') && o.type !== 'bytes')
                return 'bytes' + (o.type.slice(5) || '') + '(0)';
              return '0';
            })
            .join(', ') +
          ')'
        : '';
      return `    function ${e.name}(${paramList(e.inputs)}) external override${r} { revert("${facetName}: not implemented"); ${needsReturn ? `// return ${retZero};` : ''} }`;
    })
    .join('\n');

  return `// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice AUTO-GENERATED from plan + artifacts. Replace bodies with real logic.
interface I${facetName} {
${iface}
}

contract ${facetName} is I${facetName} {
${impl}
}
`;
}

async function main() {
  const repo = process.cwd();
  const planPath = process.argv.includes('--plan')
    ? process.argv[process.argv.indexOf('--plan') + 1]
    : path.join(repo, 'plan.json');
  const artifactsDir = process.argv.includes('--artifacts')
    ? process.argv[process.argv.indexOf('--artifacts') + 1]
    : path.join(repo, 'artifacts');

  if (!fs.existsSync(planPath)) throw new Error(`Missing plan file: ${planPath}`);
  if (!fs.existsSync(artifactsDir))
    throw new Error(`Missing artifacts dir: ${artifactsDir}. Run "npx hardhat compile".`);

  const plan = loadJSON(planPath);
  const selMap = buildSelectorMap(artifactsDir);

  const outDir = path.join(repo, 'contracts', 'ai');
  fs.mkdirSync(outDir, { recursive: true });

  const results = [];
  for (const facet of plan.facets || []) {
    const entries = [];
    for (const sel of facet.selectors || []) {
      const e = selMap.get(sel.toLowerCase());
      if (e) entries.push(e);
    }
    if (entries.length === 0) continue;
    const code = genFacet(facet.name, entries);
    const outFile = path.join(outDir, `${facet.name}.sol`);
    fs.writeFileSync(outFile, code);
    results.push({ name: facet.name, file: outFile, functions: entries.map((e) => e.name) });
    console.log(`✅ wrote ${outFile} (${entries.length} funcs)`);
  }
  const idxOut = path.join(repo, 'arch', 'ai_facets.index.json');
  fs.mkdirSync(path.dirname(idxOut), { recursive: true });
  fs.writeFileSync(idxOut, JSON.stringify({ facets: results }, null, 2));
  console.log('📦 index:', idxOut);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
