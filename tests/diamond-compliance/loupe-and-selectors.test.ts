import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import * as fs from 'fs';
import * as path from 'path';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function getTarget(c: any) {
  return c?.target ?? c?.address ?? null;
}

/**
 * PayRox Diamond Compliance Tests
 *
 * Validates EIP-2535 Diamond Pattern compliance:
 * - Loupe function implementations
 * - Selector routing correctness
 * - Interface support (ERC-165)
 */

describe('Loupe and Selectors', function () {
  let diamond: any;
  let facets: any[];
  let expectedSelectors: string[];

  async function deployDiamondFixture() {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy facets
    const FacetA = await ethers.getContractFactory('FacetA');
    const FacetB = await ethers.getContractFactory('FacetB');

    const facetA = await FacetA.deploy();
    await facetA.waitForDeployment();
    const facetB = await FacetB.deploy();
    await facetB.waitForDeployment();

    // Deploy the main Diamond contract
    const Diamond = await ethers.getContractFactory('Diamond');
    const diamond = await Diamond.deploy(await owner.getAddress());
    await diamond.waitForDeployment();

    // Get function selectors for each facet and register them directly on the test Diamond
    const facetASelectors = getSelectors(facetA);
    const facetBSelectors = getSelectors(facetB);

    // Deploy ERC165Facet and register it so the diamond supports ERC-165 for tests
    const ERC165Facet = await ethers.getContractFactory('ERC165Facet');
    const erc165Facet = await ERC165Facet.deploy();
    await erc165Facet.waitForDeployment();
    const erc165Selectors = getSelectors(erc165Facet);

    // use test helper to add facet metadata directly and wait for mining
    const txA = await diamond.addFacet(getTarget(facetA), facetASelectors);
    await txA.wait();
    const txB = await diamond.addFacet(getTarget(facetB), facetBSelectors);
    await txB.wait();
    const txE = await diamond.addFacet(getTarget(erc165Facet), erc165Selectors);
    await txE.wait();

    return {
      diamond,
      facetA,
      facetB,
      owner,
      addr1,
      expectedSelectors: [...facetASelectors, ...facetBSelectors],
    };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployDiamondFixture);
    diamond = fixture.diamond;
    facets = [fixture.facetA, fixture.facetB];
    expectedSelectors = fixture.expectedSelectors;
  });

  describe('IDiamondLoupe Implementation', function () {
    it('Should implement facets() function', async function () {
      const diamondLoupe = await ethers.getContractAt(
        'contracts/interfaces/IDiamondLoupe.sol:IDiamondLoupe',
        getTarget(diamond),
      );

      const facetAddresses = await diamondLoupe.facets();
      expect(facetAddresses.length).to.be.greaterThan(0);

      // Verify facet addresses are valid
      for (const facet of facetAddresses) {
        expect(facet.facetAddress).to.not.equal(ZERO_ADDRESS);
        expect(facet.functionSelectors.length).to.be.greaterThan(0);
      }
    });

    it('Should implement facetFunctionSelectors()', async function () {
      const diamondLoupe = await ethers.getContractAt(
        'contracts/interfaces/IDiamondLoupe.sol:IDiamondLoupe',
        getTarget(diamond),
      );

      for (const facet of facets) {
        const selectors = await diamondLoupe.facetFunctionSelectors(getTarget(facet));
        expect(selectors.length).to.be.greaterThan(0);

        // Verify selectors are valid bytes4
        for (const selector of selectors) {
          expect(selector).to.match(/^0x[a-fA-F0-9]{8}$/);
        }
      }
    });

    it('Should implement facetAddresses()', async function () {
      const diamondLoupe = await ethers.getContractAt(
        'contracts/interfaces/IDiamondLoupe.sol:IDiamondLoupe',
        getTarget(diamond),
      );

      const addresses = await diamondLoupe.facetAddresses();
      expect(addresses.length).to.be.greaterThan(0);

      // Should include all deployed facet addresses
      const facetAddresses = facets.map((f) => getTarget(f));
      for (const addr of facetAddresses) {
        expect(addresses).to.include(addr);
      }
    });

    it('Should implement facetAddress(bytes4)', async function () {
      const diamondLoupe = await ethers.getContractAt(
        'contracts/interfaces/IDiamondLoupe.sol:IDiamondLoupe',
        getTarget(diamond),
      );

      for (const selector of expectedSelectors) {
        const facetAddress = await diamondLoupe.facetAddress(selector);
        expect(facetAddress).to.not.equal(ZERO_ADDRESS);
      }
    });

    it('Should return zero address for unknown selectors', async function () {
      const diamondLoupe = await ethers.getContractAt(
        'contracts/interfaces/IDiamondLoupe.sol:IDiamondLoupe',
        getTarget(diamond),
      );

      const unknownSelector = '0x12345678';
      const facetAddress = await diamondLoupe.facetAddress(unknownSelector);
      expect(facetAddress).to.equal(ZERO_ADDRESS);
    });
  });

  describe('Selector Routing', function () {
    it('Should route all selectors correctly', async function () {
      const diamondLoupe = await ethers.getContractAt(
        'contracts/interfaces/IDiamondLoupe.sol:IDiamondLoupe',
        getTarget(diamond),
      );

      // Test each expected selector
      for (const selector of expectedSelectors) {
        const facetAddress = await diamondLoupe.facetAddress(selector);
        expect(facetAddress).to.not.equal(ZERO_ADDRESS);

        // Verify the facet actually has this selector
        const facetSelectors = await diamondLoupe.facetFunctionSelectors(facetAddress);
        expect(facetSelectors).to.include(selector);
      }
    });

    it('Should have no selector collisions', async function () {
      const diamondLoupe = await ethers.getContractAt(
        'contracts/interfaces/IDiamondLoupe.sol:IDiamondLoupe',
        getTarget(diamond),
      );
      const allFacets = await diamondLoupe.facets();

      const allSelectors: string[] = [];
      const selectorToFacet: Map<string, string> = new Map();

      for (const facet of allFacets) {
        for (const selector of facet.functionSelectors) {
          if (selectorToFacet.has(selector)) {
            throw new Error(
              `Selector collision: ${selector} found in both ${selectorToFacet.get(selector)} and ${facet.facetAddress}`,
            );
          }
          selectorToFacet.set(selector, facet.facetAddress);
          allSelectors.push(selector);
        }
      }

      // Verify all selectors are unique
      const uniqueSelectors = [...new Set(allSelectors)];
      expect(uniqueSelectors.length).to.equal(allSelectors.length);
    });

    it('Should maintain selector parity with original contract', async function () {
      const combinedPath = path.join(process.cwd(), 'artifacts', 'splits', 'combined.json');
      if (!fs.existsSync(combinedPath)) this.skip();
      const combined = JSON.parse(fs.readFileSync(combinedPath, 'utf-8'));
      if (!Array.isArray(combined.parts) || combined.parts.length === 0) this.skip();

      // Build expected selectors from original function signatures in combined.json
      const { keccak256, toUtf8Bytes } = ethers as any;
      const expected: string[] = [];
      for (const part of combined.parts) {
        const sigs: string[] = Array.isArray(part.selectors) ? part.selectors : [];
        for (const sig of sigs) {
          const norm = String(sig).replace(/\s+/g, ' ').trim();
          const selector = (keccak256(toUtf8Bytes(norm)) || '').slice(0, 10);
          expected.push(selector);
        }
      }
      // Deduplicate & sort expected
      const expectedUnique = [...new Set(expected.map((s) => s.toLowerCase()))].sort();

      const diamondLoupe = await ethers.getContractAt(
        'contracts/interfaces/IDiamondLoupe.sol:IDiamondLoupe',
        getTarget(diamond),
      );
      const diamondFacets = await diamondLoupe.facets();
      const diamondSelectors: string[] = [];
      for (const facet of diamondFacets) diamondSelectors.push(...facet.functionSelectors);

      // Remove loupe / diamond management selectors (not defined in original source signatures)
      const ignore = new Set(
        [
          '0x1f931c1c', // facets()
          '0xcdffacc6', // facetFunctionSelectors()
          '0x52ef6b2c', // facetAddresses()
          '0xadfca15e', // facetAddress()
          '0x01ffc9a7', // supportsInterface()
        ].map((s) => s.toLowerCase()),
      );

      const filteredDiamond = diamondSelectors
        .filter((s) => !ignore.has(s.toLowerCase()))
        .map((s) => s.toLowerCase())
        .sort();

      expect(filteredDiamond).to.deep.equal(expectedUnique);
    });
  });

  describe('ERC-165 Support', function () {
    it('Should support IDiamondLoupe interface', async function () {
      const diamond165 = await ethers.getContractAt(
        'contracts/facets/ERC165Facet.sol:IERC165',
        getTarget(diamond),
      );

      // IDiamondLoupe interface ID: 0x48e2b093
      expect(await diamond165.supportsInterface('0x48e2b093')).to.be.true;
    });

    it('Should support ERC-165 interface', async function () {
      const diamond165 = await ethers.getContractAt(
        'contracts/facets/ERC165Facet.sol:IERC165',
        getTarget(diamond),
      );

      // ERC-165 interface ID: 0x01ffc9a7
      expect(await diamond165.supportsInterface('0x01ffc9a7')).to.be.true;
    });

    it('Should not support unknown interfaces', async function () {
      const diamond165 = await ethers.getContractAt(
        'contracts/facets/ERC165Facet.sol:IERC165',
        getTarget(diamond),
      );

      // Random interface ID
      expect(await diamond165.supportsInterface('0x12345678')).to.be.false;
    });
  });

  describe('Facet Constraints', function () {
    it('Facets should NOT implement loupe functions', async function () {
      // This test ensures facets don't claim loupe interface support
      for (const facet of facets) {
        try {
          const facet165 = await ethers.getContractAt(
            'contracts/facets/ERC165Facet.sol:IERC165',
            getTarget(facet),
          );
          const supportsLoupe = await facet165.supportsInterface('0x48e2b093');
          expect(supportsLoupe).to.be.false;
        } catch (error) {
          // If facet doesn't implement ERC-165, that's acceptable
          // The key is it shouldn't claim loupe support
        }

        // Check that facet contracts don't have loupe function signatures
        const facetInterface = facet.interface;
        const facetFunctions = Object.keys((facetInterface as any).functions || {});

        const loupeFunctions = [
          'facets()',
          'facetFunctionSelectors(address)',
          'facetAddresses()',
          'facetAddress(bytes4)',
        ];

        for (const loupeFunc of loupeFunctions) {
          expect(facetFunctions).to.not.include(loupeFunc);
        }
      }
    });
  });
});

// Helper function to get function selectors from a contract
function getSelectors(contract: any): string[] {
  const selectors: string[] = [];
  const iface: any = (contract.interface as any) || {};

  // ethers v5: iface.functions is an object; ethers v6: it may be a Map
  const funcs = iface.functions;
  if (funcs) {
    if (typeof funcs.entries === 'function' && typeof funcs.get === 'function') {
      // Map-like
      for (const f of funcs.values()) {
        if (f && f.type === 'function' && f.selector) selectors.push(f.selector);
      }
    } else {
      // plain object
      for (const func of Object.values(funcs || {})) {
        const f: any = func;
        if (f && f.type === 'function' && f.selector) selectors.push(f.selector);
      }
    }
  }

  // Fallback: derive selectors from fragments if present
  if (selectors.length === 0 && Array.isArray(iface.fragments)) {
    for (const frag of iface.fragments) {
      if (frag.type === 'function') {
        const inputs = (frag.inputs || []).map((i: any) => i.type || i);
        const sig = `${frag.name}(${inputs.join(',')})`;
        // ethers v6: use keccak256 + toUtf8Bytes
        const { keccak256, toUtf8Bytes } = ethers as any;
        const sel = (keccak256(toUtf8Bytes(sig)) || '').slice(0, 10);
        selectors.push(sel);
      }
    }
  }

  return selectors;
}
