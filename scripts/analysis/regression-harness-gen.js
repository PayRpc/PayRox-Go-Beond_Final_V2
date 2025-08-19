#!/usr/bin/env node
/**
 * Regression Harness Generator (conservative, review-first)
 *
 * Inputs:
 *   --orig <artifactsDir>      Path to Hardhat artifacts for the ORIGINAL monolith (default: artifacts)
 *   --diamond <artifactsDir>   Path to Hardhat artifacts for the DIAMOND (often same 'artifacts')
 *   --contract <Name>          Contract name to probe (e.g., Test)
 *   --out <dir>                Output dir (default: .payrox/generated/analysis/<ts>/harness)
 *
 * Output:
 *   - harness.js : runnable Node script (ethers v5) comparing ORIGINAL vs DIAMOND addresses
 *   - probes.json: placeholder for arg sets (non-zero-arg methods can be added later)
 *   - report.md  : how to run + what’s covered
 *   - files are written under .payrox/generated/... only (no in-place edits)
 *
 * Run:
 *   node scripts/analysis/regression-harness-gen.js --contract Test
 *   (Then:)
 *   $env:ORIGINAL_ADDRESS=0x...; $env:DIAMOND_ADDRESS=0x...; node <out>/harness.js
 */
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const a = process.argv.slice(2);
  const out = { orig: 'artifacts', diamond: 'artifacts', contract: null, out: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--orig') out.orig = a[++i];
    else if (a[i] === '--diamond') out.diamond = a[++i];
    else if (a[i] === '--contract') out.contract = a[++i];
    else if (a[i] === '--out') out.out = a[++i];
  }
  if (!out.contract) throw new Error('Missing --contract <Name>');
  return out;
}

function isoTs() {
  return new Date().toISOString().replace(/[:]/g, '-');
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function findArtifactByName(root, name) {
  // Hardhat layout: artifacts/contracts/**/<Name>.sol/<Name>.json
  let found = null;
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile() && p.endsWith('.json') && ent.name === `${name}.json`) {
        try {
          const j = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (j && j.contractName === name && Array.isArray(j.abi)) {
            found = { path: p, abi: j.abi, bytecode: j.bytecode || null };
          }
        } catch {}
      }
      if (found) return;
    }
  }
  if (fs.existsSync(root)) walk(root);
  return found;
}

function filterZeroArgViews(abi) {
  return abi
    .filter(
      (x) =>
        x.type === 'function' &&
        (x.stateMutability === 'view' || x.stateMutability === 'pure') &&
        (x.inputs || []).length === 0,
    )
    .map((x) => {
      const sig = `${x.name}()`;
      return { name: x.name, signature: sig, stateMutability: x.stateMutability };
    });
}

function generateHarnessJS(outDir, contractName, abi, probesFileRel) {
  const content = `
// Auto-generated regression harness for ${contractName}
// Compares zero-arg view/pure function outputs between ORIGINAL and DIAMOND addresses.
// Usage:
//   set ORIGINAL_ADDRESS and DIAMOND_ADDRESS env vars, optionally RPC_URL (defaults to http://127.0.0.1:8545)
//   node ${path.basename(outDir)}/harness.js

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

(async () => {
  const RPC = process.env.RPC_URL || "http://127.0.0.1:8545";
  const ORIGINAL = process.env.ORIGINAL_ADDRESS;
  const DIAMOND = process.env.DIAMOND_ADDRESS;
  if (!ORIGINAL || !DIAMOND) {
    console.error(JSON.stringify({ ok:false, error:"Missing ORIGINAL_ADDRESS or DIAMOND_ADDRESS env" }));
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const abi = ${JSON.stringify(abi, null, 2)};
  const orig = new ethers.Contract(ORIGINAL, abi, provider);
  const dia  = new ethers.Contract(DIAMOND, abi, provider);

  // Load zero-arg view probes (discovered at gen-time)
  const probes = JSON.parse(fs.readFileSync(path.join(__dirname, "${probesFileRel}"), "utf8"));
  const results = [];
  let mismatches = 0;

  for (const p of probes.zeroArgViews) {
    const fn = p.signature; // e.g., "balance()"
    try {
      const a = await orig[fn]();
      const b = await dia[fn]();
      const eq = JSON.stringify(a) === JSON.stringify(b);
      if (!eq) mismatches++;
      results.push({ signature: fn, original: a, diamond: b, equal: eq });
    } catch (e) {
      results.push({ signature: fn, error: String(e) });
    }
  }

  const report = { ok: mismatches === 0, mismatches, total: probes.zeroArgViews.length, results };
  const outPath = path.join(__dirname, "report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})();
`;
  fs.writeFileSync(path.join(outDir, 'harness.js'), content);
}

function main() {
  const opts = parseArgs();
  const outDir = opts.out || path.join('.payrox', 'generated', 'analysis', isoTs(), 'harness');
  mkdirp(outDir);

  const artO = findArtifactByName(opts.orig, opts.contract);
  const artD = findArtifactByName(opts.diamond, opts.contract); // same ABI expected

  const report = {
    ok: true,
    contract: opts.contract,
    origArtifact: artO ? artO.path : null,
    diamondArtifact: artD ? artD.path : null,
    outDir: path.resolve(outDir),
    warnings: [],
    files: [],
  };

  if (!artO || !artD) {
    report.ok = false;
    report.warnings.push('Artifact not found for one or both targets; ensure hardhat compile ran.');
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  const zeroViews = filterZeroArgViews(artO.abi);
  const probes = { zeroArgViews: zeroViews };
  const probesPath = path.join(outDir, 'probes.json');
  fs.writeFileSync(probesPath, JSON.stringify(probes, null, 2));
  report.files.push(probesPath);

  generateHarnessJS(outDir, opts.contract, artO.abi, path.basename(probesPath));
  report.files.push(path.join(outDir, 'harness.js'));

  const readme =
    `# Regression Harness (auto-generated)

Contract: **${opts.contract}**

## What it does
- Calls all zero-argument view/pure functions on both ORIGINAL and DIAMOND addresses and compares results.
- Writes a JSON report to ` +
    '`report.json`' +
    `.

## How to run
\`\`\`powershell
# Start a local node (Hardhat) in another terminal if needed:
# npx hardhat node

# Set addresses (deployed monolith & diamond)
$env:RPC_URL="http://127.0.0.1:8545"
$env:ORIGINAL_ADDRESS="0xOriginal..."
$env:DIAMOND_ADDRESS="0xDiamond..."

# Run harness
node ${path.basename(outDir)}/harness.js
Get-Content ${path.basename(outDir)}/report.json
\`\`\`

## Notes
- For non-zero-arg functions, add inputs in \`probes.json\` (future extension).
- Ensure the ABI in artifacts matches deployed bytecode.
`;
  const readmePath = path.join(outDir, 'README.md');
  fs.writeFileSync(readmePath, readme);
  report.files.push(readmePath);

  console.log(JSON.stringify(report, null, 2));
}

try {
  main();
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
  process.exit(1);
}
