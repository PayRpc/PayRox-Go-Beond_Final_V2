import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * PayRox Epoch Rules Tests
 * 
 * Validates epoch-based routing and upgrade mechanisms:
 * - Next epoch only rule enforcement
 * - Last-write-wins for same epoch
 * - Epoch guard validations
 */

describe("Epoch Rules", function () {
  let diamond: Contract;
  let epochManager: Contract;
  let facetA: Contract;
  let facetB: Contract;
  let owner: any;
  let addr1: any;

  async function deployEpochSystemFixture() {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy epoch manager
    const EpochManager = await ethers.getContractFactory("EpochManager");
    const epochManager = await EpochManager.deploy();

    // Deploy facets
    const FacetA = await ethers.getContractFactory("FacetA");
    const FacetB = await ethers.getContractFactory("FacetB");
    
    const facetA = await FacetA.deploy();
    const facetB = await FacetB.deploy();

    // Deploy diamond with epoch support
    const DiamondWithEpoch = await ethers.getContractFactory("DiamondWithEpoch");
    const diamond = await DiamondWithEpoch.deploy(owner.address, epochManager.address);

    return { diamond, epochManager, facetA, facetB, owner, addr1 };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployEpochSystemFixture);
    diamond = fixture.diamond;
    epochManager = fixture.epochManager;
    facetA = fixture.facetA;
    facetB = fixture.facetB;
    owner = fixture.owner;
    addr1 = fixture.addr1;
  });

  describe("Epoch Management", function () {
    it("Should start at epoch 0", async function () {
      const currentEpoch = await epochManager.getCurrentEpoch();
      expect(currentEpoch).to.equal(0);
    });

    it("Should allow epoch advancement by authorized accounts", async function () {
      await epochManager.advanceEpoch();
      const newEpoch = await epochManager.getCurrentEpoch();
      expect(newEpoch).to.equal(1);
    });

    it("Should prevent unauthorized epoch advancement", async function () {
      await expect(
        epochManager.connect(addr1).advanceEpoch()
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should emit EpochAdvanced event", async function () {
      await expect(epochManager.advanceEpoch())
        .to.emit(epochManager, "EpochAdvanced")
        .withArgs(0, 1);
    });
  });

  describe("Next Epoch Only Rule", function () {
    it("Should reject commits for current epoch", async function () {
      const currentEpoch = await epochManager.getCurrentEpoch();
      
      await expect(
        diamond.commitFacetUpdate(facetA.address, ["0x12345678"], currentEpoch)
      ).to.be.revertedWith("Can only commit to next epoch");
    });

    it("Should reject commits for past epochs", async function () {
      await epochManager.advanceEpoch(); // Move to epoch 1
      
      await expect(
        diamond.commitFacetUpdate(facetA.address, ["0x12345678"], 0)
      ).to.be.revertedWith("Can only commit to next epoch");
    });

    it("Should accept commits for next epoch", async function () {
      const currentEpoch = await epochManager.getCurrentEpoch();
      const nextEpoch = currentEpoch + 1;
      
      await expect(
        diamond.commitFacetUpdate(facetA.address, ["0x12345678"], nextEpoch)
      ).to.not.be.reverted;
    });

    it("Should reject commits too far in future", async function () {
      const currentEpoch = await epochManager.getCurrentEpoch();
      const futureEpoch = currentEpoch + 10;
      
      await expect(
        diamond.commitFacetUpdate(facetA.address, ["0x12345678"], futureEpoch)
      ).to.be.revertedWith("Epoch too far in future");
    });
  });

  describe("Last-Write-Wins for Same Epoch", function () {
    it("Should allow multiple commits to same epoch", async function () {
      const nextEpoch = (await epochManager.getCurrentEpoch()) + 1;
      
      // First commit
      await diamond.commitFacetUpdate(facetA.address, ["0x12345678"], nextEpoch);
      
      // Second commit to same epoch should overwrite
      await diamond.commitFacetUpdate(facetB.address, ["0x12345678"], nextEpoch);
      
      const commitment = await diamond.getEpochCommitment(nextEpoch, "0x12345678");
      expect(commitment.facetAddress).to.equal(facetB.address);
    });

    it("Should emit CommitmentOverwritten event", async function () {
      const nextEpoch = (await epochManager.getCurrentEpoch()) + 1;
      
      await diamond.commitFacetUpdate(facetA.address, ["0x12345678"], nextEpoch);
      
      await expect(
        diamond.commitFacetUpdate(facetB.address, ["0x12345678"], nextEpoch)
      ).to.emit(diamond, "CommitmentOverwritten")
       .withArgs(nextEpoch, "0x12345678", facetA.address, facetB.address);
    });

    it("Should track commitment history", async function () {
      const nextEpoch = (await epochManager.getCurrentEpoch()) + 1;
      
      await diamond.commitFacetUpdate(facetA.address, ["0x12345678"], nextEpoch);
      await diamond.commitFacetUpdate(facetB.address, ["0x12345678"], nextEpoch);
      
      const history = await diamond.getCommitmentHistory(nextEpoch, "0x12345678");
      expect(history.length).to.equal(2);
      expect(history[0].facetAddress).to.equal(facetA.address);
      expect(history[1].facetAddress).to.equal(facetB.address);
    });
  });

  describe("Epoch Activation", function () {
    it("Should activate committed changes when epoch advances", async function () {
      const currentEpoch = await epochManager.getCurrentEpoch();
      const nextEpoch = currentEpoch + 1;
      
      // Commit for next epoch
      await diamond.commitFacetUpdate(facetA.address, ["0x12345678"], nextEpoch);
      
      // Advance epoch
      await epochManager.advanceEpoch();
      
      // Check that routing is now active
      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", diamond.address);
      const facetAddress = await diamondLoupe.facetAddress("0x12345678");
      expect(facetAddress).to.equal(facetA.address);
    });

    it("Should not activate uncommitted changes", async function () {
      const currentEpoch = await epochManager.getCurrentEpoch();
      
      // Advance epoch without any commits
      await epochManager.advanceEpoch();
      
      // Routing should remain unchanged
      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", diamond.address);
      const facetAddress = await diamondLoupe.facetAddress("0x12345678");
      expect(facetAddress).to.equal(ethers.constants.AddressZero);
    });

    it("Should handle batch activation efficiently", async function () {
      const currentEpoch = await epochManager.getCurrentEpoch();
      const nextEpoch = currentEpoch + 1;
      
      // Commit multiple selectors
      const selectors = ["0x12345678", "0x87654321", "0xabcdefab"];
      for (const selector of selectors) {
        await diamond.commitFacetUpdate(facetA.address, [selector], nextEpoch);
      }
      
      // Advance epoch (should activate all in one transaction)
      const tx = await epochManager.advanceEpoch();
      const receipt = await tx.wait();
      
      // Check gas usage is reasonable for batch activation
      expect(receipt.gasUsed).to.be.lt(ethers.utils.parseUnits("500000", "wei"));
      
      // Verify all selectors are active
      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", diamond.address);
      for (const selector of selectors) {
        const facetAddress = await diamondLoupe.facetAddress(selector);
        expect(facetAddress).to.equal(facetA.address);
      }
    });
  });

  describe("Epoch Guards", function () {
    it("Should validate epoch consistency", async function () {
      const currentEpoch = await epochManager.getCurrentEpoch();
      
      await expect(
        diamond.validateEpochConsistency()
      ).to.not.be.reverted;
    });

    it("Should detect epoch desync", async function () {
      // Simulate epoch manager being out of sync
      await epochManager.setEpoch(100); // Force a large jump
      
      await expect(
        diamond.validateEpochConsistency()
      ).to.be.revertedWith("Epoch desync detected");
    });

    it("Should enforce maximum epoch jump limit", async function () {
      const currentEpoch = await epochManager.getCurrentEpoch();
      const maxJump = await diamond.MAX_EPOCH_JUMP();
      
      await expect(
        epochManager.setEpoch(currentEpoch + maxJump + 1)
      ).to.be.revertedWith("Epoch jump too large");
    });

    it("Should validate dispatcher authority", async function () {
      // Only authorized dispatcher should manage epochs
      await expect(
        diamond.connect(addr1).emergencyEpochReset()
      ).to.be.revertedWith("Only dispatcher can reset epochs");
    });
  });

  describe("Routing Transition", function () {
    it("Should handle smooth selector transitions", async function () {
      const currentEpoch = await epochManager.getCurrentEpoch();
      const nextEpoch = currentEpoch + 1;
      
      // Initially route to facetA
      await diamond.commitFacetUpdate(facetA.address, ["0x12345678"], nextEpoch);
      await epochManager.advanceEpoch();
      
      // Verify routing
      let diamondLoupe = await ethers.getContractAt("IDiamondLoupe", diamond.address);
      expect(await diamondLoupe.facetAddress("0x12345678")).to.equal(facetA.address);
      
      // Plan transition to facetB for next epoch
      const newNextEpoch = (await epochManager.getCurrentEpoch()) + 1;
      await diamond.commitFacetUpdate(facetB.address, ["0x12345678"], newNextEpoch);
      await epochManager.advanceEpoch();
      
      // Verify transition
      diamondLoupe = await ethers.getContractAt("IDiamondLoupe", diamond.address);
      expect(await diamondLoupe.facetAddress("0x12345678")).to.equal(facetB.address);
    });

    it("Should maintain routing history", async function () {
      const selector = "0x12345678";
      
      // Route through multiple facets across epochs
      let currentEpoch = await epochManager.getCurrentEpoch();
      
      await diamond.commitFacetUpdate(facetA.address, [selector], currentEpoch + 1);
      await epochManager.advanceEpoch();
      
      await diamond.commitFacetUpdate(facetB.address, [selector], currentEpoch + 2);
      await epochManager.advanceEpoch();
      
      // Check routing history
      const history = await diamond.getRoutingHistory(selector);
      expect(history.length).to.equal(2);
      expect(history[0].facetAddress).to.equal(facetA.address);
      expect(history[1].facetAddress).to.equal(facetB.address);
    });
  });

  describe("Emergency Procedures", function () {
    it("Should allow emergency epoch pause", async function () {
      await diamond.emergencyPause();
      
      const currentEpoch = await epochManager.getCurrentEpoch();
      await expect(
        diamond.commitFacetUpdate(facetA.address, ["0x12345678"], currentEpoch + 1)
      ).to.be.revertedWith("System paused");
    });

    it("Should allow emergency epoch reset by dispatcher", async function () {
      await diamond.emergencyEpochReset();
      
      const currentEpoch = await epochManager.getCurrentEpoch();
      expect(currentEpoch).to.equal(0);
    });

    it("Should clear pending commitments on reset", async function () {
      const nextEpoch = (await epochManager.getCurrentEpoch()) + 1;
      
      await diamond.commitFacetUpdate(facetA.address, ["0x12345678"], nextEpoch);
      await diamond.emergencyEpochReset();
      
      const commitment = await diamond.getEpochCommitment(nextEpoch, "0x12345678");
      expect(commitment.facetAddress).to.equal(ethers.constants.AddressZero);
    });
  });
});
