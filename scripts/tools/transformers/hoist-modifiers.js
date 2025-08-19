#!/usr/bin/env node
// hoist-modifiers.js
// Stub: detect and suggest hoisting of common modifiers/roles

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
    FunctionDefinition(node) {
      if (node.modifiers && node.modifiers.length) {
        node.modifiers.forEach((m) => {
          const name = m.name || (m.expression && m.expression.name);
          if (name && ['onlyOwner', 'onlyRole', 'whenNotPaused'].includes(name)) {
            suggestions.push({
              function: node.name,
              modifier: name,
              suggestion:
                'Consider mapping to facet-local guard or shared guard and inject check in header.',
            });
          }
        });
      }
    },
  });

  const out = ensureOutDir();
  fs.writeFileSync(path.join(out, 'changes.json'), JSON.stringify(suggestions, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(out, 'report.md'),
    `File: ${file}\nModifier hoist suggestions: ${suggestions.length}\n`,
    'utf8',
  );
  fs.writeFileSync(path.join(out, path.basename(file)), src, 'utf8');
  console.log('Wrote suggestions to', out);
}

if (process.argv.length < 3) {
  console.error('usage: node hoist-modifiers.js <file.sol>');
  process.exit(1);
}
run(process.argv[2]);
