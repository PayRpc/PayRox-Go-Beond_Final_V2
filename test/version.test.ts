import { expect } from "chai";
import { ethers } from "hardhat";

describe("VersionFacet (canonical)", function () {
  it("exposes version() and versionNumber() matching package.json or PRX_VERSION", async function () {
    const pkg = require("../package.json");
    const expected = process.env.PRX_VERSION || pkg.version;

    const Contract = await ethers.getContractFactory("VersionFacet");
    const deployed = await Contract.deploy();
    await deployed.waitForDeployment();

  const v = await deployed.version();
  const n = await deployed.versionNumber();

  expect(v).to.equal(expected);
  // versionNumber should be a BigInt or BigNumber-like; coerce to string for stable check
  expect(String(n)).to.match(/^[0-9]+$/);
  });
});
