import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('ManifestDispatcher - IDiamondLoupeEx compliance', function () {
  let dispatcher: any;
  let owner: any;

  before(async function () {
    [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('ManifestDispatcher');
    dispatcher = await Factory.deploy(owner.address, 1);
    await dispatcher.waitForDeployment();
  });

  it('Ex loupe methods exist and return sensible defaults', async function () {
    // Call a few Ex methods to ensure they exist and do not revert
    const addrs = await dispatcher.facetAddressesEx(false);
    expect(Array.isArray(addrs)).to.equal(true);

    const facets = await dispatcher.facetsEx(false);
    expect(Array.isArray(facets)).to.equal(true);

    const batch = await dispatcher.facetAddressesBatchEx([]);
    expect(Array.isArray(batch)).to.equal(true);
  });

  it('facet metadata and helpers return defaults for unknown facet', async function () {
    const zero = ethers.ZeroAddress || '0x0000000000000000000000000000000000000000';
    const meta = await dispatcher.facetMetadata(zero);
    expect(meta.name).to.equal('');
    expect(meta.category).to.equal('');
    expect(meta.dependencies.length).to.equal(0);
    expect(meta.isUpgradeable).to.equal(true);

    const conflicts = await dispatcher.checkStorageConflicts(zero);
    expect(conflicts.length).to.equal(0);

    const impl = await dispatcher.facetImplementation(zero);
    expect(impl).to.equal(zero);

    const hash = await dispatcher.facetHash(zero);
    expect(hash).to.be.a('string');

    const selHash = await dispatcher.selectorHash(zero);
    expect(selHash).to.be.a('string');

    const prov = await dispatcher.facetProvenance(zero);
    expect(prov[0]).to.equal(zero);
    const ts = prov[1];
    if (ts && typeof ts.toNumber === 'function') {
      expect(ts.toNumber()).to.equal(0);
    } else if (typeof ts === 'bigint') {
      expect(Number(ts)).to.equal(0);
    } else {
      expect(Number(ts)).to.equal(0);
    }
  });
});
