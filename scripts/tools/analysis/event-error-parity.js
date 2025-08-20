#!/usr/bin/env node
// event-error-parity.js
// Compare event signatures and custom errors between two sets of contracts

const fs = require('fs');
const path = require('path');
let parser;
try {
  parser = require('@solidity-parser/parser');
} catch (e) {
  console.error('Please install @solidity-parser/parser');
  process.exit(1);
}

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
function ensureOut() {
  const o = path.resolve('.payrox/generated/analysis', ts());
  fs.mkdirSync(o, { recursive: true });
  return o;
}

function extractEventsAndErrors(file) {
  const src = fs.readFileSync(file, 'utf8');
  const ast = parser.parse(src, { tolerant: true });
  const items = { events: [], errors: [] };
  parser.visit(ast, {
    EventDefinition(node) {
      items.events.push(node.name);
    },
    UserDefinedError(node) {
      items.errors.push(node.name);
    },
  });
  return items;
}

function run(originalDir, diamondDir) {
  const origFiles = fs.readdirSync(originalDir).filter((f) => f.endsWith('.sol'));
  const out = ensureOut();
  const report = [];
  origFiles.forEach((f) => {
    const o = extractEventsAndErrors(path.join(originalDir, f));
    const dpath = path.join(diamondDir, f);
    if (!fs.existsSync(dpath)) {
      report.push({ file: f, status: 'missing_in_diamond' });
      return;
    }
    const d = extractEventsAndErrors(dpath);
    const evDiff = o.events.filter((x) => !d.events.includes(x));
    const errDiff = o.errors.filter((x) => !d.errors.includes(x));
    if (evDiff.length || errDiff.length)
      report.push({ file: f, evMissing: evDiff, errMissing: errDiff });
  });
  fs.writeFileSync(path.join(out, 'parity.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log('Wrote parity report to', out);
}

if (process.argv.length < 3) {
  console.error('usage: node event-error-parity.js <original_dir> <diamond_dir>');
  process.exit(1);
}
run(process.argv[2], process.argv[3]);
