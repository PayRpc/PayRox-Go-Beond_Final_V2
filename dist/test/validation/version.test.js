'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const chai_1 = require('chai');
const hardhat_1 = require('hardhat');
describe('VersionFacet (validation)', () => {
  it('exposes version() and versionNumber()', async () => {
    const Fac = await hardhat_1.ethers.getContractFactory('VersionFacet');
    const f = await Fac.deploy();
    await f.waitForDeployment();
    const v = await f.version();
    const n = await f.versionNumber();
    (0, chai_1.expect)(v).to.be.a('string').that.is.not.empty;
    (0, chai_1.expect)(n).to.be.a('bigint');
    (0, chai_1.expect)(n).to.be.greaterThan(0n);
  }).timeout(30000);
});
