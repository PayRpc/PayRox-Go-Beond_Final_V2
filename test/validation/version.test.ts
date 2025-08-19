import { expect } from "chai";
import { ethers } from "hardhat";

describe("VersionFacet (validation)", () => {
  it("exposes version() and versionNumber()", async () => {
    const Fac = await ethers.getContractFactory("VersionFacet");
    const f = await Fac.deploy();
    await f.waitForDeployment();

    const v = await f.version();
    const n = await f.versionNumber();

    expect(v).to.be.a("string").that.is.not.empty;
    expect(n).to.be.a("bigint");
    expect(n).to.be.greaterThan(0n);
  }).timeout(30000);
});
