import { expect } from "chai";
import { ethers } from "hardhat";
import { PlanningLock } from "../typechain-types";
import { SchemeNFT } from "../typechain-types";
import { SchemeCredits } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PlanningLock - Integration", function () {
  let planningLock: PlanningLock;
  let schemeNft: SchemeNFT;
  let schemeCredits: SchemeCredits;
  let owner: SignerWithAddress;
  let developer: SignerWithAddress;
  let regulator: SignerWithAddress;

  const SOLENT_CATCHMENT = "SOLENT";
  const THAMES_CATCHMENT = "THAMES";
  const SOLENT_HASH = ethers.keccak256(ethers.toUtf8Bytes(SOLENT_CATCHMENT));
  const THAMES_HASH = ethers.keccak256(ethers.toUtf8Bytes(THAMES_CATCHMENT));

  beforeEach(async function () {
    [owner, developer, regulator] = await ethers.getSigners();

    // Deploy SchemeNFT
    const SchemeNFTFactory = await ethers.getContractFactory("SchemeNFT");
    schemeNft = await SchemeNFTFactory.deploy(regulator.address);
    await schemeNft.waitForDeployment();

    // Deploy SchemeCredits
    const SchemeCreditsFactory = await ethers.getContractFactory("SchemeCredits");
    schemeCredits = await SchemeCreditsFactory.deploy(regulator.address, await schemeNft.getAddress());
    await schemeCredits.waitForDeployment();

    // Deploy PlanningLock
    const PlanningLockFactory = await ethers.getContractFactory("PlanningLock");
    planningLock = await PlanningLockFactory.deploy(
      await schemeNft.getAddress(),
      await schemeCredits.getAddress()
    );
    await planningLock.waitForDeployment();

    // Set PlanningLock as the planning contract in SchemeCredits
    await schemeCredits.connect(regulator).setPlanningContract(await planningLock.getAddress());
  });

  describe("submitApplication", function () {
    it("Should lock credits for multiple schemes in same catchment", async function () {
      // Mint two schemes in SOLENT catchment
      const scheme1Id = await schemeNft.connect(regulator).mintScheme.staticCall(
        "Solent Scheme A",
        SOLENT_CATCHMENT,
        "Location A",
        50, // 50 tonnes
        "ipfs://cid1"
      );
      await schemeNft.connect(regulator).mintScheme(
        "Solent Scheme A",
        SOLENT_CATCHMENT,
        "Location A",
        50,
        "ipfs://cid1"
      );

      const scheme2Id = await schemeNft.connect(regulator).mintScheme.staticCall(
        "Solent Scheme B",
        SOLENT_CATCHMENT,
        "Location B",
        30,
        "ipfs://cid2"
      );
      await schemeNft.connect(regulator).mintScheme(
        "Solent Scheme B",
        SOLENT_CATCHMENT,
        "Location B",
        30,
        "ipfs://cid2"
      );

      // Mint credits to developer for both schemes
      // 50 tonnes = 5,000,000 credits (50 * 100,000)
      // 30 tonnes = 3,000,000 credits (30 * 100,000)
      const credits1 = 50 * 100000; // 5,000,000 credits
      const credits2 = 30 * 100000; // 3,000,000 credits

      await schemeCredits.connect(regulator).mintCredits(scheme1Id, developer.address, credits1);
      await schemeCredits.connect(regulator).mintCredits(scheme2Id, developer.address, credits2);

      // Submit application with both schemes
      const amount1 = 10 * 100000; // 1,000,000 credits (10 tonnes)
      const amount2 = 5 * 100000; // 500,000 credits (5 tonnes)

      const tx = await planningLock.submitApplication(
        developer.address,
        [scheme1Id, scheme2Id],
        [amount1, amount2],
        SOLENT_HASH
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.topics[0] === ethers.id("ApplicationSubmitted(uint256,address,bytes32,uint256[],uint256[])")
      );

      expect(event).to.not.be.undefined;

      // Check locked balances
      expect(await schemeCredits.lockedBalance(scheme1Id, developer.address)).to.equal(amount1);
      expect(await schemeCredits.lockedBalance(scheme2Id, developer.address)).to.equal(amount2);

      // Check application was stored
      const appId = 1;
      const app = await planningLock.applications(appId);
      expect(app.developer).to.equal(developer.address);
      expect(app.catchmentHash).to.equal(SOLENT_HASH);
      expect(app.status).to.equal(0); // PENDING
    });

    it("Should revert if scheme catchment does not match required catchment", async function () {
      // Mint scheme in SOLENT
      const schemeId = await schemeNft.connect(regulator).mintScheme.staticCall(
        "Solent Scheme",
        SOLENT_CATCHMENT,
        "Location",
        50,
        "ipfs://cid1"
      );
      await schemeNft.connect(regulator).mintScheme(
        "Solent Scheme",
        SOLENT_CATCHMENT,
        "Location",
        50,
        "ipfs://cid1"
      );

      // Mint credits
      await schemeCredits.connect(regulator).mintCredits(schemeId, developer.address, 50 * 100000);

      // Try to submit with THAMES catchment - should revert
      await expect(
        planningLock.submitApplication(
          developer.address,
          [schemeId],
          [10 * 100000],
          THAMES_HASH
        )
      ).to.be.revertedWith("Scheme catchment mismatch");
    });

    it("Should revert if developer has insufficient credits", async function () {
      // Mint scheme
      const schemeId = await schemeNft.connect(regulator).mintScheme.staticCall(
        "Solent Scheme",
        SOLENT_CATCHMENT,
        "Location",
        50,
        "ipfs://cid1"
      );
      await schemeNft.connect(regulator).mintScheme(
        "Solent Scheme",
        SOLENT_CATCHMENT,
        "Location",
        50,
        "ipfs://cid1"
      );

      // Mint only 5 tonnes worth of credits
      await schemeCredits.connect(regulator).mintCredits(schemeId, developer.address, 5 * 100000);

      // Try to lock 10 tonnes - should revert
      await expect(
        planningLock.submitApplication(
          developer.address,
          [schemeId],
          [10 * 100000],
          SOLENT_HASH
        )
      ).to.be.revertedWith("Insufficient unlocked balance");
    });
  });

  describe("approveApplication", function () {
    it("Should burn locked credits and reduce remaining tonnes", async function () {
      // Setup: Mint scheme and credits
      const schemeId = await schemeNft.connect(regulator).mintScheme.staticCall(
        "Solent Scheme",
        SOLENT_CATCHMENT,
        "Location",
        50, // 50 tonnes
        "ipfs://cid1"
      );
      await schemeNft.connect(regulator).mintScheme(
        "Solent Scheme",
        SOLENT_CATCHMENT,
        "Location",
        50,
        "ipfs://cid1"
      );

      const totalCredits = 50 * 100000; // 5,000,000 credits
      await schemeCredits.connect(regulator).mintCredits(schemeId, developer.address, totalCredits);

      // Submit application
      const lockAmount = BigInt(10 * 100000); // 1,000,000 credits (10 tonnes)
      const tx = await planningLock.submitApplication(
        developer.address,
        [schemeId],
        [lockAmount],
        SOLENT_HASH
      );
      await tx.wait();

      const appId = 1;
      const initialBalance = await schemeCredits.balanceOf(developer.address, schemeId);
      const initialRemaining = (await schemeNft.schemes(schemeId)).remainingTonnes;

      // Approve application
      await planningLock.approveApplication(appId);

      // Check credits were burned
      const finalBalance = await schemeCredits.balanceOf(developer.address, schemeId);
      expect(finalBalance).to.equal(initialBalance - lockAmount);

      // Check locked balance is zero
      expect(await schemeCredits.lockedBalance(schemeId, developer.address)).to.equal(0);

      // Check remaining tonnes reduced
      const finalRemaining = (await schemeNft.schemes(schemeId)).remainingTonnes;
      expect(finalRemaining).to.equal(initialRemaining - BigInt(10)); // 10 tonnes reduced

      // Check application status
      const app = await planningLock.applications(appId);
      expect(app.status).to.equal(1); // APPROVED
    });

    it("Should handle multiple schemes in approval", async function () {
      // Mint two schemes
      const scheme1Id = await schemeNft.connect(regulator).mintScheme.staticCall(
        "Solent Scheme A",
        SOLENT_CATCHMENT,
        "Location A",
        50,
        "ipfs://cid1"
      );
      await schemeNft.connect(regulator).mintScheme(
        "Solent Scheme A",
        SOLENT_CATCHMENT,
        "Location A",
        50,
        "ipfs://cid1"
      );

      const scheme2Id = await schemeNft.connect(regulator).mintScheme.staticCall(
        "Solent Scheme B",
        SOLENT_CATCHMENT,
        "Location B",
        30,
        "ipfs://cid2"
      );
      await schemeNft.connect(regulator).mintScheme(
        "Solent Scheme B",
        SOLENT_CATCHMENT,
        "Location B",
        30,
        "ipfs://cid2"
      );

      // Mint credits
      await schemeCredits.connect(regulator).mintCredits(scheme1Id, developer.address, 50 * 100000);
      await schemeCredits.connect(regulator).mintCredits(scheme2Id, developer.address, 30 * 100000);

      // Submit application
      const amount1 = 10 * 100000; // 10 tonnes
      const amount2 = 5 * 100000; // 5 tonnes
      await planningLock.submitApplication(
        developer.address,
        [scheme1Id, scheme2Id],
        [amount1, amount2],
        SOLENT_HASH
      );

      const appId = 1;
      const initialRemaining1 = (await schemeNft.schemes(scheme1Id)).remainingTonnes;
      const initialRemaining2 = (await schemeNft.schemes(scheme2Id)).remainingTonnes;

      // Approve
      await planningLock.approveApplication(appId);

      // Check both schemes updated
      const finalRemaining1 = (await schemeNft.schemes(scheme1Id)).remainingTonnes;
      const finalRemaining2 = (await schemeNft.schemes(scheme2Id)).remainingTonnes;

      expect(finalRemaining1).to.equal(initialRemaining1 - 10n);
      expect(finalRemaining2).to.equal(initialRemaining2 - 5n);

      // Check locked balances are zero
      expect(await schemeCredits.lockedBalance(scheme1Id, developer.address)).to.equal(0);
      expect(await schemeCredits.lockedBalance(scheme2Id, developer.address)).to.equal(0);
    });
  });

  describe("rejectApplication", function () {
    it("Should unlock credits without burning", async function () {
      // Setup: Mint scheme and credits
      const schemeId = await schemeNft.connect(regulator).mintScheme.staticCall(
        "Solent Scheme",
        SOLENT_CATCHMENT,
        "Location",
        50,
        "ipfs://cid1"
      );
      await schemeNft.connect(regulator).mintScheme(
        "Solent Scheme",
        SOLENT_CATCHMENT,
        "Location",
        50,
        "ipfs://cid1"
      );

      const totalCredits = 50 * 100000;
      await schemeCredits.connect(regulator).mintCredits(schemeId, developer.address, totalCredits);

      // Submit application
      const lockAmount = 10 * 100000;
      await planningLock.submitApplication(
        developer.address,
        [schemeId],
        [lockAmount],
        SOLENT_HASH
      );

      const appId = 1;
      const initialBalance = await schemeCredits.balanceOf(developer.address, schemeId);
      const initialRemaining = (await schemeNft.schemes(schemeId)).remainingTonnes;

      // Reject application
      await planningLock.rejectApplication(appId);

      // Check credits were NOT burned (balance unchanged)
      const finalBalance = await schemeCredits.balanceOf(developer.address, schemeId);
      expect(finalBalance).to.equal(initialBalance);

      // Check locked balance is zero (unlocked)
      expect(await schemeCredits.lockedBalance(schemeId, developer.address)).to.equal(0);

      // Check remaining tonnes NOT reduced
      const finalRemaining = (await schemeNft.schemes(schemeId)).remainingTonnes;
      expect(finalRemaining).to.equal(initialRemaining);

      // Check application status
      const app = await planningLock.applications(appId);
      expect(app.status).to.equal(2); // REJECTED
    });

    it("Should handle multiple schemes in rejection", async function () {
      // Mint two schemes
      const scheme1Id = await schemeNft.connect(regulator).mintScheme.staticCall(
        "Solent Scheme A",
        SOLENT_CATCHMENT,
        "Location A",
        50,
        "ipfs://cid1"
      );
      await schemeNft.connect(regulator).mintScheme(
        "Solent Scheme A",
        SOLENT_CATCHMENT,
        "Location A",
        50,
        "ipfs://cid1"
      );

      const scheme2Id = await schemeNft.connect(regulator).mintScheme.staticCall(
        "Solent Scheme B",
        SOLENT_CATCHMENT,
        "Location B",
        30,
        "ipfs://cid2"
      );
      await schemeNft.connect(regulator).mintScheme(
        "Solent Scheme B",
        SOLENT_CATCHMENT,
        "Location B",
        30,
        "ipfs://cid2"
      );

      // Mint credits
      await schemeCredits.connect(regulator).mintCredits(scheme1Id, developer.address, 50 * 100000);
      await schemeCredits.connect(regulator).mintCredits(scheme2Id, developer.address, 30 * 100000);

      // Submit application
      const amount1 = 10 * 100000;
      const amount2 = 5 * 100000;
      await planningLock.submitApplication(
        developer.address,
        [scheme1Id, scheme2Id],
        [amount1, amount2],
        SOLENT_HASH
      );

      const appId = 1;

      // Reject
      await planningLock.rejectApplication(appId);

      // Check both locked balances are zero
      expect(await schemeCredits.lockedBalance(scheme1Id, developer.address)).to.equal(0);
      expect(await schemeCredits.lockedBalance(scheme2Id, developer.address)).to.equal(0);

      // Check application status
      const app = await planningLock.applications(appId);
      expect(app.status).to.equal(2); // REJECTED
    });
  });

  describe("Edge cases", function () {
    it("Should revert if trying to approve non-existent application", async function () {
      await expect(planningLock.approveApplication(999)).to.be.revertedWith("Application does not exist");
    });

    it("Should revert if trying to approve already approved application", async function () {
      // Setup and submit
      const schemeId = await schemeNft.connect(regulator).mintScheme.staticCall(
        "Solent Scheme",
        SOLENT_CATCHMENT,
        "Location",
        50,
        "ipfs://cid1"
      );
      await schemeNft.connect(regulator).mintScheme(
        "Solent Scheme",
        SOLENT_CATCHMENT,
        "Location",
        50,
        "ipfs://cid1"
      );

      await schemeCredits.connect(regulator).mintCredits(schemeId, developer.address, 50 * 100000);
      await planningLock.submitApplication(
        developer.address,
        [schemeId],
        [10 * 100000],
        SOLENT_HASH
      );

      const appId = 1;
      await planningLock.approveApplication(appId);

      // Try to approve again - should revert
      await expect(planningLock.approveApplication(appId)).to.be.revertedWith("Application not pending");
    });

    it("Should revert if trying to reject non-existent application", async function () {
      await expect(planningLock.rejectApplication(999)).to.be.revertedWith("Application does not exist");
    });
  });
});
