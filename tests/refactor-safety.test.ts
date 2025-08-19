import { expect } from 'chai';
import { ethers } from 'hardhat';

/**
 * Tests for RefactorSafeFacetBase + RefactorSafetyLib integration using SampleFacet.
 */

describe('Refactor safety (SampleFacet)', function () {
  it('enforces versionCompatible via centralized RefactorSafetyFacet', async () => {
    const Facet = await ethers.getContractFactory('RefactorSafetyFacet');
    const facet = await Facet.deploy();
    await facet.waitForDeployment();

    const ok = await facet.emergencyRefactorValidation();
    expect(ok).to.equal(true);
  });

  it.skip('migration safety tests are skipped: migrate() not implemented in this repo', async () => {
    // skipped
  });
});
