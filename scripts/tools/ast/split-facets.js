#!/usr/bin/env node
// AST-based facet splitter using solidity-parser-antlr
// Usage: node split-facets.js <solidity-file>

const fs = require('fs');
const path = require('path');
let parser;
try {
  parser = require('solidity-parser-antlr');
} catch (e) {
  console.error(
    'Missing dependency: solidity-parser-antlr. Install with `npm install solidity-parser-antlr`',
  );
  process.exit(2);
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: split-facets.js <file.sol>');
  process.exit(1);
}

const text = fs.readFileSync(file, 'utf8');
let ast;
try {
  ast = parser.parse(text, { tolerant: true });
} catch (e) {
  console.error('Parse error:', e.message || e);
  process.exit(3);
}

// Collect contract/library/interface nodes with their source ranges
const fragments = [];
parser.visit(ast, {
  ContractDefinition(node) {
    fragments.push({
      name: node.name,
      start: node.loc.start.line,
      end: node.loc.end.line,
      type: 'contract',
    });
  },
  // Note: interface and library are also ContractDefinition nodes in parser
});

// If no contract-like nodes, return whole file
if (fragments.length === 0) {
  const selectors = extractSelectors(text);
  const out = [
    {
      name: path.basename(file, '.sol'),
      code: text,
      selectors,
      size: Buffer.byteLength(text, 'utf8'),
    },
  ];
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

// Build slices by line numbers
const lines = text.split(/\r?\n/);
const out = [];
for (let i = 0; i < fragments.length; i++) {
  const f = fragments[i];
  const startIdx = Math.max(0, f.start - 1);
  const endIdx = Math.min(lines.length, f.end);
  const code = lines.slice(startIdx, endIdx).join('\n');
  const selectors = extractSelectors(code);
  out.push({ name: f.name, code, selectors, size: Buffer.byteLength(code, 'utf8') });
}

console.log(JSON.stringify(out, null, 2));

function extractSelectors(code) {
  const re = /function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(public|external|internal|private)?/g;
  const sels = [];
  let m;
  while ((m = re.exec(code)) !== null) {
    const name = m[1];
    const args = m[2].trim();
    sels.push(`${name}(${args})`);
  }
  return sels;
}
