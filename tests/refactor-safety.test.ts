import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('RefactorSafetyFacet', function () {
  async function deployFacet() {
    const Facet = await ethers.getContractFactory('RefactorSafetyFacet');
    const facet = await Facet.deploy();
    await facet.waitForDeployment();
    return { facet };
  }

  it('emergencyRefactorValidation() returns true', async () => {
    const { facet } = await loadFixture(deployFacet);
    expect(await facet.emergencyRefactorValidation()).to.equal(true);
  });

  it('does NOT expose ERC-165 or loupe functions (policy: centralized only)', async () => {
    const { facet } = await loadFixture(deployFacet);

    // 1) No supportsInterface(bytes4)
    const hasSupports = facet.interface.fragments.some(
      (fr: any) => fr.type === 'function' && fr.name === 'supportsInterface',
    );
    expect(hasSupports).to.equal(false);

    // 1b) Also check by selector to avoid name obfuscation/overloads
    const selectorOf = (sig: string) => ethers.keccak256(ethers.toUtf8Bytes(sig)).slice(0, 10);
    const bannedSignatures = [
      'supportsInterface(bytes4)',
      // Common DiamondLoupe / admin signatures we disallow on facets
      'diamondCut(tuple(address,uint8,bytes4[])[],address,bytes)',
      'facets()',
      'facetFunctionSelectors(address)',
      'facetAddresses()',
      'facetAddress(bytes4)',
    ];
    const bannedSelectors = new Set(bannedSignatures.map(selectorOf));

    const facetSelectors = facet.interface.fragments
      .filter((fr: any) => fr.type === 'function')
      .map((fr: any) => {
        const inputs = (fr.inputs || []).map((i: any) => i.type).join(',');
        const sig = `${fr.name}(${inputs})`;
        return selectorOf(sig);
      });

    for (const s of facetSelectors) {
      expect(bannedSelectors.has(s)).to.equal(false, `Facet exposes banned selector ${s}`);
    }

    // 2) No DiamondLoupe / admin functions on the facet ABI (check names)
    const bannedNames = new Set<string>([
      'diamondCut', // admin
      'facets', // loupe
      'facetFunctionSelectors',
      'facetAddresses',
      'facetAddress',
    ]);

    const facetFunctionNames = facet.interface.fragments
      .filter((fr: any) => fr.type === 'function')
      .map((fr: any) => fr.name);

    for (const name of facetFunctionNames) {
      expect(bannedNames.has(name)).to.equal(false, `Facet leaks loupe/admin function ${name}`);
    }
  });

  it.skip('migration safety: to be added when migrate() exists', async () => {
    // Placeholder for future negative-path checks (storage parity, etc.)
  });
});
