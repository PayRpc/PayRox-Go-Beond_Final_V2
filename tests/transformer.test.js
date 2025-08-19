const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('transformer', () => {
  const sol = path.resolve(__dirname, '..', 'contracts', 'test', 'Example.sol');
  const outDirRoot = path.resolve(process.cwd(), '.payrox', 'generated', 'transformers');

  test('runs transformer and writes generated files (no compile)', () => {
    // Clean up previous artifacts
    try { execSync(`rm -rf "${outDirRoot}"`); } catch(e) {}

    // Run transformer with --no-compile
    execSync(`node scripts/transformers/transform-one.js --file "${sol}" --contract Example --no-compile`, { stdio: 'inherit' });

    // Expect generated files exist
    const dirs = fs.readdirSync(outDirRoot).sort().reverse();
    expect(dirs.length).toBeGreaterThan(0);
    const applied = path.join(outDirRoot, dirs[0], 'applied');
    const generated = fs.readdirSync(applied).filter(f => f.endsWith('_Transformed.sol'));
    expect(generated.length).toBeGreaterThan(0);
  }, 20000);
});
