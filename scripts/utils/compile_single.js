const fs = require('fs');
const solc = require('solc');
const path = require('path');

const file = path.join('contracts','Tests','Test-1.cleaned.facet.sol');
const src = fs.readFileSync(file,'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'TestFacet.sol': { content: src }
  },
  settings: { outputSelection: { '*': { '*': ['abi','evm.bytecode'] } } }
};

const out = JSON.parse(solc.compile(JSON.stringify(input)));
if (out.errors) {
  console.log('Compilation errors/warnings:');
  for (const e of out.errors) console.log(e.formattedMessage || e.message);
}
else {
  console.log('Compiled successfully.');
}

console.log(JSON.stringify(out.contracts, null, 2).slice(0,2000));
