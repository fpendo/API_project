import { expect } from "chai";
import { ethers } from "hardhat";
import { SchemeNFT, SchemeCredits, PlanningLock } from "../typechain-types";

describe("PlanningLock (Skeleton)", function () {
  let schemeNFT: SchemeNFT;
  let schemeCredits: SchemeCredits;
  let planningLock: PlanningLock;
  let owner: any;
  let developer: any;

  beforeEach(async function () {
    [owner, developer] = await ethers.getSigners();

    // Deploy SchemeNFT
    const SchemeNFTFactory = await ethers.getContractFactory("SchemeNFT");
    schemeNFT = await SchemeNFTFactory.deploy(owner.address);

    // Deploy SchemeCredits
    const SchemeCreditsFactory = await ethers.getContractFactory("SchemeCredits");
    schemeCredits = await SchemeCreditsFactory.deploy(
      owner.address,
      await schemeNFT.getAddress()
    );

    // Deploy PlanningLock
    const PlanningLockFactory = await ethers.getContractFactory("PlanningLock");
    planningLock = await PlanningLockFactory.deploy(
      await schemeNFT.getAddress(),
      await schemeCredits.getAddress()
    );
  });

  describe("Deployment", function () {
    it("Should store SchemeNFT address", async function () {
      expect(await planningLock.schemeNft()).to.equal(await schemeNFT.getAddress());
    });

    it("Should store SchemeCredits address", async function () {
      expect(await planningLock.schemeCredits()).to.equal(await schemeCredits.getAddress());
    });

    it("Should initialize nextApplicationId to 1", async function () {
      expect(await planningLock.nextApplicationId()).to.equal(1);
    });
  });

  describe("submitApplication", function () {
    it("Should store application data correctly", async function () {
      const catchmentHash = ethers.keccak256(ethers.toUtf8Bytes("SOLENT"));
      const schemeIds = [1, 2];
      const amounts = [1000, 2000];

      await planningLock.submitApplication(
        developer.address,
        schemeIds,
        amounts,
        catchmentHash
      );

      const applicationId = 1;
      const app = await planningLock.applications(applicationId);

      expect(app.developer).to.equal(developer.address);
      expect(app.catchmentHash).to.equal(catchmentHash);
      expect(app.status).to.equal(0); // PENDING = 0

      // Read arrays using helper functions
      const storedSchemeIds = await planningLock.getApplicationSchemeIds(applicationId);
      const storedAmounts = await planningLock.getApplicationAmounts(applicationId);

      expect(storedSchemeIds).to.deep.equal(schemeIds);
      expect(storedAmounts).to.deep.equal(amounts);
    });

    it("Should emit ApplicationSubmitted event", async function () {
      const catchmentHash = ethers.keccak256(ethers.toUtf8Bytes("SOLENT"));
      const schemeIds = [1];
      const amounts = [1000];

      await expect(
        planningLock.submitApplication(
          developer.address,
          schemeIds,
          amounts,
          catchmentHash
        )
      )
        .to.emit(planningLock, "ApplicationSubmitted")
        .withArgs(1, developer.address, catchmentHash, schemeIds, amounts);
    });

    it("Should increment nextApplicationId", async function () {
      const catchmentHash = ethers.keccak256(ethers.toUtf8Bytes("SOLENT"));

      await planningLock.submitApplication(
        developer.address,
        [1],
        [1000],
        catchmentHash
      );

      expect(await planningLock.nextApplicationId()).to.equal(2);

      await planningLock.submitApplication(
        developer.address,
        [2],
        [2000],
        catchmentHash
      );

      expect(await planningLock.nextApplicationId()).to.equal(3);
    });

    it("Should revert if developer is zero address", async function () {
      const catchmentHash = ethers.keccak256(ethers.toUtf8Bytes("SOLENT"));

      await expect(
        planningLock.submitApplication(
          ethers.ZeroAddress,
          [1],
          [1000],
          catchmentHash
        )
      ).to.be.revertedWith("Invalid developer address");
    });

    it("Should revert if schemeIds and amounts arrays length mismatch", async function () {
      const catchmentHash = ethers.keccak256(ethers.toUtf8Bytes("SOLENT"));

      await expect(
        planningLock.submitApplication(
          developer.address,
          [1, 2],
          [1000],
          catchmentHash
        )
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("Should revert if schemeIds array is empty", async function () {
      const catchmentHash = ethers.keccak256(ethers.toUtf8Bytes("SOLENT"));

      await expect(
        planningLock.submitApplication(
          developer.address,
          [],
          [],
          catchmentHash
        )
      ).to.be.revertedWith("Must include at least one scheme");
    });
  });

  describe("approveApplication", function () {
    it("Should change status to APPROVED", async function () {
      const catchmentHash = ethers.keccak256(ethers.toUtf8Bytes("SOLENT"));

      await planningLock.submitApplication(
        developer.address,
        [1],
        [1000],
        catchmentHash
      );

      await planningLock.approveApplication(1);

      const app = await planningLock.applications(1);
      expect(app.status).to.equal(1); // APPROVED = 1
    });

    it("Should emit ApplicationApproved event", async function () {
      const catchmentHash = ethers.keccak256(ethers.toUtf8Bytes("SOLENT"));

      await planningLock.submitApplication(
        developer.address,
        [1],
        [1000],
        catchmentHash
      );

      await expect(planningLock.approveApplication(1))
        .to.emit(planningLock, "ApplicationApproved")
        .withArgs(1);
    });

    it("Should revert if application does not exist", async function () {
      await expect(planningLock.approveApplication(999)).to.be.revertedWith(
        "Application does not exist"
      );
    });

    it("Should revert if application is not pending", async function () {
      const catchmentHash = ethers.keccak256(ethers.toUtf8Bytes("SOLENT"));

      await planningLock.submitApplication(
        developer.address,
        [1],
        [1000],
        catchmentHash
      );

      await planningLock.approveApplication(1);

      await expect(planningLock.approveApplication(1)).to.be.revertedWith(
        "Application not pending"
      );
    });
  });

  describe("rejectApplication", function () {
    it("Should change status to REJECTED", async function () {
      const catchmentHash = ethers.keccak256(ethers.toUtf8Bytes("SOLENT"));

      await planningLock.submitApplication(
        developer.address,
        [1],
        [1000],
        catchmentHash
      );

      await planningLock.rejectApplication(1);

      const app = await planningLock.applications(1);
      expect(app.status).to.equal(2); // REJECTED = 2
    });

    it("Should emit ApplicationRejected event", async function () {
      const catchmentHash = ethers.keccak256(ethers.toUtf8Bytes("SOLENT"));

      await planningLock.submitApplication(
        developer.address,
        [1],
        [1000],
        catchmentHash
      );

      await expect(planningLock.rejectApplication(1))
        .to.emit(planningLock, "ApplicationRejected")
        .withArgs(1);
    });

    it("Should revert if application does not exist", async function () {
      await expect(planningLock.rejectApplication(999)).to.be.revertedWith(
        "Application does not exist"
      );
    });

    it("Should revert if application is not pending", async function () {
      const catchmentHash = ethers.keccak256(ethers.toUtf8Bytes("SOLENT"));

      await planningLock.submitApplication(
        developer.address,
        [1],
        [1000],
        catchmentHash
      );

      await planningLock.rejectApplication(1);

      await expect(planningLock.rejectApplication(1)).to.be.revertedWith(
        "Application not pending"
      );
    });
  });
});

