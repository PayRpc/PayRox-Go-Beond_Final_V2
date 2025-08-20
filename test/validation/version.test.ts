import { expect } from 'chai';
import { ethers } from 'hardhat';
const E = ethers as any;

describe('VersionFacet (validation)', () => {
  it('exposes version() and versionNumber()', async () => {
    const Fac: any = await E.getContractFactory('VersionFacet');
    const f: any = await Fac.deploy();
    if (typeof f.waitForDeployment === 'function') await f.waitForDeployment();

    const v = await f.version();
    const n = await f.versionNumber();

    expect(v).to.be.a('string').that.is.not.empty;
    expect(n).to.be.a('bigint');
    expect(n).to.be.greaterThan(0n);
  }).timeout(30000);
});
