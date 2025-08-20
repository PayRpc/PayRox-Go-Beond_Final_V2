#!/usr/bin/env node
// constructor-to-initialize.js
// Conservative transformer stub: suggests lifting constructor params to initialize(...)

const fs = require('fs');
const path = require('path');
let parser;
try {
  parser = require('@solidity-parser/parser');
} catch (e) {
  console.error('Please install @solidity-parser/parser: npm i -D @solidity-parser/parser');
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

function report(outDir, name, reportObj) {
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(reportObj, null, 2), 'utf8');
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

  // naive scan: find contract constructors and record params
  const edits = [];
  parser.visit(ast, {
    ContractDefinition(node) {
      const name = node.name;
      node.subNodes.forEach((sn) => {
        if (sn.type === 'FunctionDefinition' && sn.isConstructor) {
          const params = (sn.parameters && sn.parameters.parameters) || [];
          const paramList = params.map((p) => ({
            name: p.name,
            type: p.typeName ? src.slice(p.typeName.range[0], p.typeName.range[1]) : 'unknown',
          }));
          edits.push({
            contract: name,
            constructor: { params: paramList },
            note: 'Suggest create initialize(args) that assigns these params to storage and add initializer guard.',
          });
        }
      });
    },
  });

  const out = ensureOutDir();
  report(out, 'changes.json', edits);
  report(out, 'report.md', {
    file: path.relative(process.cwd(), file),
    editsCount: edits.length,
    summary: 'Constructor->initialize suggestions (review before applying).',
  });
  // write original file copy for reference
  fs.writeFileSync(path.join(out, path.basename(file)), src, 'utf8');
  console.log('Wrote suggestions to', out);
}

if (process.argv.length < 3) {
  console.error('usage: node constructor-to-initialize.js <file.sol>');
  process.exit(1);
}
run(process.argv[2]);
