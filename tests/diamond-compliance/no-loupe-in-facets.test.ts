import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { ethers } from 'hardhat';

describe('Repo-wide: no loupe/165 in facets', () => {
  const artifactsRoot = path.join(process.cwd(), 'artifacts', 'contracts', 'facets');

  it('every facet ABI is free of loupe/admin/165 selectors', () => {
    const files: string[] = [];
    (function walk(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir)) {
        const p = path.join(dir, e);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.json')) files.push(p);
      }
    })(artifactsRoot);

    const banned = new Set<string>([
      ethers.id('diamondCut((address,uint8,bytes4[])[],address,bytes)').slice(0, 10),
      ethers.id('facets()').slice(0, 10),
      ethers.id('facetFunctionSelectors(address)').slice(0, 10),
      ethers.id('facetAddresses()').slice(0, 10),
      ethers.id('facetAddress(bytes4)').slice(0, 10),
      ethers.id('supportsInterface(bytes4)').slice(0, 10),
    ]);

    const allowlist = new Set(['ERC165Facet.json', 'ChunkFactoryFacet.json', 'IERC165.json']);
    for (const f of files) {
      const base = path.basename(f);
      if (allowlist.has(base)) continue; // canonical providers may expose ERC-165 on purpose
      const abi = JSON.parse(fs.readFileSync(f, 'utf8')).abi ?? [];
      const selectors = abi
        .filter((fr: any) => fr.type === 'function')
        .map((fr: any) => {
          const inputs = (fr.inputs ?? []).map((i: any) => i.type).join(',');
          const sig = `${fr.name}(${inputs})`;
          return ethers.id(sig).slice(0, 10);
        });

      for (const sel of selectors) {
        expect(banned.has(sel)).to.equal(false, `${path.basename(f)} leaks ${sel}`);
      }
    }
  });
});
