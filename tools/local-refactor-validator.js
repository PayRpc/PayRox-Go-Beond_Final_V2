const fs = require('fs');
const path = require('path');

const FACETS_DIR = process.env.FACETS_DIR || 'contracts/facets';
const ROOT = process.cwd();
const reportLines = [];
let critical = false;

function ok(msg){ console.log('✅', msg); reportLines.push(msg); }
function warn(msg){ console.log('⚠️ ', msg); reportLines.push(msg); }
function err(msg){ console.error('❌', msg); reportLines.push(msg); critical = true; }

console.log('Running local refactor validator');
console.log('FACETS_DIR =', FACETS_DIR);

// 1) check banned patterns in facets
try{
  const patterns = [/function\s+facets/, /function\s+facetFunctionSelectors/, /function\s+facetAddresses/];
  const facetFiles = (function walk(dir){
    if(!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).flatMap(f=>{
      const p = path.join(dir,f);
      if(fs.statSync(p).isDirectory()) return walk(p);
      if(p.endsWith('.sol')) return [p];
      return [];
    });
  })(FACETS_DIR);
  let found = false;
  for(const f of facetFiles){
    const src = fs.readFileSync(f,'utf8');
    for(const re of patterns){
      if(re.test(src)){
        err(`Loupe function pattern ${re} found in ${f}`);
        found = true;
      }
    }
  }
  if(!found) ok('No loupe functions detected in facets');
}catch(e){ warn('Error checking facets patterns: '+e.message); }

// 2) Validate manifest
try{
  const mf = path.join(ROOT,'payrox-manifest.json');
  if(!fs.existsSync(mf)){
    warn('payrox-manifest.json not found, skipping manifest validation');
  } else {
    const data = JSON.parse(fs.readFileSync(mf,'utf8'));
    if(!('version' in data) || typeof data.facets !== 'object'){
      err('Manifest missing required fields or facets not object');
    } else {
      // ensure every facet has selectors array
      const facets = data.facets;
      const bad = [];
      for(const k of Object.keys(facets)){
        const sel = facets[k].selectors;
        if(!Array.isArray(sel)) bad.push(k);
      }
      if(bad.length) err('Facets missing selectors arrays: '+bad.join(', '));
      else ok('Manifest structure validated');
    }
  }
}catch(e){ err('Manifest validation failed: '+e.message); }

// 3) Size check via artifacts
try{
  const artDir = path.join(ROOT,'artifacts','contracts');
  if(!fs.existsSync(artDir)){
    warn('artifacts/contracts not found; run `npx hardhat compile` first');
  } else {
    const files = (function walk(dir){
      return fs.readdirSync(dir).flatMap(f=>{
        const p = path.join(dir,f);
        if(fs.statSync(p).isDirectory()) return walk(p);
        if(p.endsWith('.json')) return [p];
        return [];
      });
    })(artDir);
    const LIMIT = 24576;
    let fail = false;
    for(const f of files){
      try{
        const json = JSON.parse(fs.readFileSync(f,'utf8'));
        let bc = '';
        if(json.deployedBytecode && typeof json.deployedBytecode.object === 'string') bc = json.deployedBytecode.object;
        if(!bc && json.evm && json.evm.deployedBytecode && typeof json.evm.deployedBytecode.object === 'string') bc = json.evm.deployedBytecode.object;
        if(!bc) continue;
        bc = bc.replace(/^0x/,'');
        const bytes = Math.floor(bc.length/2);
        if(bytes > LIMIT){
          err(`${path.basename(f)} runtime bytecode ${bytes}B exceeds EIP-170 ${LIMIT}B`);
          fail = true;
        } else if(bytes > Math.floor(LIMIT*0.9)){
          warn(`${path.basename(f)} near size limit (${bytes}/${LIMIT}B)`);
        }
      }catch(e){ warn('Could not parse artifact '+f+': '+e.message); }
    }
    if(!fail) ok('Size checks passed');
  }
}catch(e){ err('Size checks failed: '+e.message); }

// write validation-report.md
try{
  const out = [];
  out.push('# PayRox Local Refactor Validation Report');
  out.push('');
  out.push('Date: '+(new Date()).toISOString());
  out.push('');
  out.push('Results:');
  out.push('');
  out.push(...reportLines.map(l=>'- '+l));
  fs.writeFileSync(path.join(ROOT,'validation-report.md'), out.join('\n'));
  ok('Wrote validation-report.md');
}catch(e){ warn('Failed to write validation-report.md: '+e.message); }

if(critical){
  console.error('\n💥 REFACTOR GATE: BLOCKED (local)');
  process.exit(2);
} else {
  console.log('\n✅ REFACTOR GATE: PASSED (local)');
  process.exit(0);
}
