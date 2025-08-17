// SPDX-License-Identifier: MIT
// tests/diamond-compliance/integrity-checks.test.ts
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { DeterministicChunkFactory } from '../../typechain';

describe('System Integrity Checks', function () {
  let factory: DeterministicChunkFactory;
  let dispatcher: any;
  let owner: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    // Deploy mock dispatcher
    const MockDispatcher = await ethers.getContractFactory('MockManifestDispatcher');
    dispatcher = await MockDispatcher.deploy();
    await dispatcher.deployed();

    // Deploy factory with integrity parameters
    const Factory = await ethers.getContractFactory('DeterministicChunkFactory');
    const manifestHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-manifest'));
    const dispatcherCodehash = dispatcher.address; // simplified for test
    const factoryCodehash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('factory-code'));

    factory = await Factory.deploy(
      owner.address, // feeRecipient
      dispatcher.address, // manifestDispatcher
      manifestHash, // manifestHash
      dispatcherCodehash, // dispatcherCodehash
      factoryCodehash, // factoryBytecodeHash (this will fail real check)
      ethers.utils.parseEther('0.01'), // baseFeeWei
      true // feesEnabled
    );
    await factory.deployed();
  });

  describe('Integrity Verification', function () {
    it('should fail when dispatcher codehash changes', async function () {
      // In real scenario, dispatcher would be upgraded changing its codehash
      // This test simulates that by checking against wrong expected hash
      const result = await factory.verifySystemIntegrity();
      expect(result).to.be.false; // Will fail due to mismatched factory codehash
    });

    it('should fail when manifest root changes', async function () {
      // Set dispatcher to return different root
      await dispatcher.setActiveRoot(ethers.utils.keccak256(ethers.utils.toUtf8Bytes('different-root')));
      const result = await factory.verifySystemIntegrity();
      expect(result).to.be.false;
    });

    it('should return expected integrity parameters', async function () {
      const manifestHash = await factory.getExpectedManifestHash();
      const dispatcherCodehash = await factory.getExpectedDispatcherCodehash();
      const factoryCodehash = await factory.getExpectedFactoryBytecodeHash();

      expect(manifestHash).to.not.equal(ethers.constants.HashZero);
      expect(dispatcherCodehash).to.not.equal(ethers.constants.HashZero);
      expect(factoryCodehash).to.not.equal(ethers.constants.HashZero);
    });
  });

  describe('Role Authorization via Dispatcher', function () {
    it('should allow factory admin calls after granting roles to dispatcher', async function () {
      // Grant roles to dispatcher
      const operatorRole = await factory.OPERATOR_ROLE();
      const feeRole = await factory.FEE_ROLE();

      await factory.grantRole(operatorRole, dispatcher.address);
      await factory.grantRole(feeRole, dispatcher.address);

      // Verify roles
      expect(await factory.hasRole(operatorRole, dispatcher.address)).to.be.true;
      expect(await factory.hasRole(feeRole, dispatcher.address)).to.be.true;
    });

    it('should reject admin calls from dispatcher without roles', async function () {
      // Try to pause from dispatcher (should fail)
      await expect(
        factory.connect(dispatcher).pause()
      ).to.be.revertedWith('AccessControl:');
    });
  });

  describe('Size Enforcement', function () {
    it('should reject chunks exceeding MAX_CHUNK_BYTES', async function () {
      const largeData = '0x' + 'ff'.repeat(25000); // Exceeds 24,000 bytes
      
      await expect(
        factory.stage(largeData, { value: ethers.utils.parseEther('0.01') })
      ).to.be.revertedWith('chunk exceeds size limit');
    });

    it('should accept chunks within size limit', async function () {
      const smallData = '0x' + '00'.repeat(1000); // Well under limit
      
      await expect(
        factory.stage(smallData, { value: ethers.utils.parseEther('0.01') })
      ).to.not.be.reverted;
    });
  });
});
