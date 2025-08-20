const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeterministicChunkFactory invariants", function () {
  let factory, deployer;

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DeterministicChunkFactory");

  // Deploy with a non-matching expectedFactoryBytecodeHash to force system-integrity failure
  // Use a hard-coded non-zero bytes32 to avoid runtime dependency on utils in the test harness
  const expectedFactoryHash = '0x' + '11'.repeat(32);

    const BYTES32_NONZERO = '0x' + '22'.repeat(32);

    // Note: we pass `deployer.address` as the manifest dispatcher here.
    // `_verifySystemIntegrity()` will try to call `activeRoot()` and will fail safely
    // (caught) because the address does not implement the dispatcher interface. The
    // test primarily asserts failure due to factory bytecode hash mismatch.
    factory = await Factory.deploy(
      deployer.address,            // feeRecipient
      deployer.address,            // manifestDispatcher (non-zero)
      BYTES32_NONZERO,            // manifestHash
      BYTES32_NONZERO,            // dispatcherCodehash
      expectedFactoryHash,         // factory bytecode hash (mismatch)
      0,                           // baseFeeWei
      false                        // feesEnabled
    );
    // Wait for deployment (compatible with ethers v5 and v6 helpers)
    if (typeof factory.deployed === 'function') {
      await factory.deployed();
    } else if (typeof factory.waitForDeployment === 'function') {
      await factory.waitForDeployment();
    }
  });

  it("verifySystemIntegrity returns false when factory bytecode hash mismatches", async function () {
    expect(await factory.verifySystemIntegrity()).to.equal(false);
  });

  it("stage reverts with System integrity check failed", async function () {
    await expect(factory.stage("0x01")).to.be.revertedWith("System integrity check failed");
  });

  it("deployDeterministic reverts with System integrity check failed", async function () {
    const zeroSalt = '0x' + '00'.repeat(32);
    await expect(factory.deployDeterministic(zeroSalt, "0x00", "0x")).to.be.revertedWith("System integrity check failed");
  });
});
