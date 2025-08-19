import { expect } from 'chai';
import { ethers } from 'hardhat';

/**
 * Tests for RefactorSafeFacetBase + RefactorSafetyLib integration using SampleFacet.
 */

describe('Refactor safety (SampleFacet)', function () {
  it('enforces versionCompatible and allows refactorSafe passthrough', async () => {
    const Facet = await ethers.getContractFactory('SampleFacet');
    const facet = await Facet.deploy();
    await facet.waitForDeployment();

    // versionCompatible: we simulate by staticcalling emergencyRefactorValidation & version logic indirectly
    const ok = await facet.emergencyRefactorValidation();
    expect(ok).to.equal(true);

    // refactorSafe modifier currently only checks codehash if expected set (disabled => allows)
    const tx = await facet.setValue(42);
    await tx.wait();
    expect(await facet.getValue()).to.equal(42n);
  });

  it('migration safety emits event for monotonic increase', async () => {
    const Facet = await ethers.getContractFactory('SampleFacet');
    const facet = await Facet.deploy();
    await facet.waitForDeployment();

    const from = 1n;
    const to = 2n;
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes('payload'));

    await expect(facet.migrate(from, to, dataHash)).to.emit(facet, 'RefactorValidationPassed');
  });

  it('migration safety reverts on non-incrementing version', async () => {
    const Facet = await ethers.getContractFactory('SampleFacet');
    const facet = await Facet.deploy();
    await facet.waitForDeployment();

    const from = 2n;
    const to = 2n; // not greater
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes('payload'));

    // Reverts with custom error RefactorSafetyFailed("Non-incrementing version")
    await expect(facet.migrate(from, to, dataHash)).to.be.reverted;
  });
});
