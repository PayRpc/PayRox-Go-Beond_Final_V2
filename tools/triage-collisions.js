/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { keccak256, toUtf8Bytes } = require('ethers'); // v6

const ARTIFACTS_ROOT = path.join(process.cwd(), 'artifacts', 'contracts');

function readJSON(f){ return JSON.parse(fs.readFileSync(f,'utf8')); }
function walk(d,out=[]){ if(!fs.existsSync(d)) return out; for(const n of fs.readdirSync(d)){const p=path.join(d,n); const s=fs.statSync(p); s.isDirectory()?walk(p,out):n.endsWith('.json')&&out.push(p);} return out; }

function typeFromAbi(i){
  const t=i.type;
  if(!t.startsWith('tuple')) return t;
  const m=t.match(/^tuple(\[.*\])?$/); const suf=m&&m[1]?m[1]:'';
  const inner='('+ (i.components||[]).map(typeFromAbi).join(',') +')';
  return inner+suf;
}
function sigOf(fn){ return `${fn.name}(${(fn.inputs||[]).map(typeFromAbi).join(',')})`; }
const sel = sig => '0x' + keccak256(toUtf8Bytes(sig)).slice(2,10);

const files = walk(ARTIFACTS_ROOT);
const owners = new Map(); // selector -> [{facet, sig}]
for(const f of files){
  let art; try{ art=readJSON(f);}catch{continue;}
  if(!art?.abi || !art?.contractName) continue;
  const src = art.sourceName || art.source || '';
  const inFacetsFolder = src.startsWith('contracts/facets/') || src.includes('/facets/');
  const deployedA = art?.deployedBytecode;
  const deployedB = art?.deployedBytecode?.object;
  const deployedC = art?.evm?.deployedBytecode?.object;
  const deployed = deployedA || deployedB || deployedC || '';
  const hasRuntime = typeof deployed === 'string' && deployed.length > 2 && deployed !== '0x';
  if(!inFacetsFolder || !hasRuntime || !/Facet$/.test(art.contractName)) continue;
  const facet = art.contractName;
  for(const fn of art.abi.filter(i=>i.type==='function')){
    const sig = sigOf(fn);
    const s = sel(sig);
    if(!owners.has(s)) owners.set(s, []);
    owners.get(s).push({ facet, sig });
  }
}

const collisions = [...owners.entries()].filter(([,arr])=>arr.length>1);
if(!collisions.length){ console.log('✅ No selector collisions'); process.exit(0); }

const out = collisions.map(([s, arr]) => ({ selector:s, owners:arr }));
fs.writeFileSync('selector-collisions.json', JSON.stringify(out,null,2));

let text = '❌ Selector collisions:\n\n';
for(const c of out){
  text += `  ${c.selector}\n`;
  for(const o of c.owners) text += `    - ${o.facet}: ${o.sig}\n`;
  text += '\n';
}
fs.writeFileSync('selector-collisions.txt', text);
console.log(text);
console.log('\n📝 Full details: selector-collisions.json');
process.exit(2);
