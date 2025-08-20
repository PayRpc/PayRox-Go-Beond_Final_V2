import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

describe('EIP-170: each facet under 24,576 bytes', () => {
  const artifactsRoot = path.join(process.cwd(), 'artifacts', 'contracts', 'facets');

  it('validates deployedBytecode length', () => {
    const limit = 24576;
    const files: string[] = [];
    (function walk(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir)) {
        const p = path.join(dir, e);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.json')) files.push(p);
      }
    })(artifactsRoot);

    for (const f of files) {
      const art = JSON.parse(fs.readFileSync(f, 'utf8'));
      const code: string = art.deployedBytecode || '0x';
      const bytes = code === '0x' ? 0 : (code.length - 2) / 2;
      expect(bytes).to.be.lte(limit, `${path.basename(f)} exceeds EIP-170 (${bytes}B)`);
    }
  });
});
