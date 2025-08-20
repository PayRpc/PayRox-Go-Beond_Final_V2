#!/usr/bin/env node
// rewire-internal-calls.js
// Analyze internal cross-contract function calls that will cross facet boundaries and suggest rewrites

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

function run(file) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(src, { tolerant: true });
  } catch (e) {
    console.error('Parse error', e);
    process.exit(2);
  }
  const findings = [];
  // naive: find MemberAccess or Identifier calls that reference contract functions on `this` or other local contract names
  parser.visit(ast, {
    FunctionCall(node) {
      if (node.expression && node.expression.type === 'MemberAccess') {
        const ma = node.expression;
        if (ma.expression && ma.expression.name && ma.memberName) {
          // e.g., OtherContract.foo()
          findings.push({
            location: node.loc,
            expression: `${ma.expression.name}.${ma.memberName}`,
            suggestion:
              'If crossing into a different facet, consider routing via library or delegatecall shim.',
          });
        }
      }
    },
  });

  const out = ensureOut();
  fs.writeFileSync(path.join(out, 'findings.json'), JSON.stringify(findings, null, 2), 'utf8');
  fs.writeFileSync(path.join(out, path.basename(file)), src, 'utf8');
  console.log('Wrote analysis to', out);
}

if (process.argv.length < 3) {
  console.error('usage: node rewire-internal-calls.js <file.sol>');
  process.exit(1);
}
run(process.argv[2]);
