#!/usr/bin/env node
// synth-storage.js
// Stub: synthesize namespaced storage libs and suggest rewriting state accesses

const fs = require('fs');
const path = require('path');
let parser;
try {
  parser = require('@solidity-parser/parser');
} catch (e) {
  console.error('Please install @solidity-parser/parser');
  process.exit(1);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
function ensureOutDir() {
  const out = path.resolve('.payrox/generated/transformers', timestamp());
  fs.mkdirSync(out, { recursive: true });
  return out;
}

function run(file) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(src, { tolerant: true });
  } catch (e) {
    console.error('Parse error:', e);
    process.exit(2);
  }

  const suggestions = [];
  parser.visit(ast, {
    ContractDefinition(node) {
      const name = node.name;
      // naive: if contract has state variables, suggest a {Name}Storage lib
      const hasState = node.subNodes.some((sn) => sn.type === 'StateVariableDeclaration');
      if (hasState) {
        suggestions.push({
          contract: name,
          storageLib: `${name}Storage`,
          slot: `keccak256(abi.encodePacked("${name}.storage"))`,
          note: 'Suggest synthesize storage lib and rewrite S.x to Layout(SLOT).x',
        });
      }
    },
  });

  const out = ensureOutDir();
  fs.writeFileSync(path.join(out, 'changes.json'), JSON.stringify(suggestions, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(out, 'report.md'),
    `File: ${file}\nSuggested storage synth: ${suggestions.length} items\n`,
    'utf8',
  );
  fs.writeFileSync(path.join(out, path.basename(file)), src, 'utf8');
  console.log('Wrote suggestions to', out);
}

if (process.argv.length < 3) {
  console.error('usage: node synth-storage.js <file.sol>');
  process.exit(1);
}
run(process.argv[2]);
