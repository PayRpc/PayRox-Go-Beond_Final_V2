#!/usr/bin/env node
// Cross-platform runner for diamond compliance tests.
// Reason: calling `npx hardhat test <dir>` can pass a directory to Mocha on some shells (Windows/PowerShell),
// which causes MODULE_NOT_FOUND; this script enumerates test files and calls hardhat with explicit file paths.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function walk(dir, filelist = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, filelist);
    } else if (e.isFile() && /\.(js|ts)$/.test(e.name)) {
      filelist.push(full);
    }
  }
  return filelist;
}

function findDiamondTests() {
  const testDir = path.resolve(process.cwd(), 'tests', 'diamond-compliance');
  if (!fs.existsSync(testDir)) return [];
  return walk(testDir);
}

function main() {
  const files = findDiamondTests();
  if (files.length === 0) {
    console.log(
      'No files found under tests/diamond-compliance — falling back to `npx hardhat test`',
    );
    const r = spawnSync('npx', ['hardhat', 'test'], { stdio: 'inherit', shell: true });
    process.exit(r.status === null ? 1 : r.status);
  }

  console.log('Running hardhat tests for the following files:');
  files.forEach((f) => console.log(' -', path.relative(process.cwd(), f)));

  // Run hardhat test with explicit file list. Use shell:true for Windows npx behavior.
  const args = ['hardhat', 'test', ...files];
  const r = spawnSync('npx', args, { stdio: 'inherit', shell: true });
  process.exit(r.status === null ? 1 : r.status);
}

main();
