import { expect } from "chai";
import { ethers } from "hardhat";
import { SchemeNFT, SchemeCredits } from "../typechain-types";

describe("SchemeCredits", function () {
  let schemeNFT: SchemeNFT;
  let schemeCredits: SchemeCredits;
  let owner: any;
  let recipient: any;

  beforeEach(async function () {
    [owner, recipient] = await ethers.getSigners();

    // Deploy SchemeNFT
    const SchemeNFTFactory = await ethers.getContractFactory("SchemeNFT");
    schemeNFT = await SchemeNFTFactory.deploy(owner.address);

    // Deploy SchemeCredits with SchemeNFT address
    const SchemeCreditsFactory = await ethers.getContractFactory("SchemeCredits");
    schemeCredits = await SchemeCreditsFactory.deploy(owner.address, await schemeNFT.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await schemeCredits.owner()).to.equal(owner.address);
    });

    it("Should store SchemeNFT address", async function () {
      expect(await schemeCredits.schemeNft()).to.equal(await schemeNFT.getAddress());
    });
  });

  describe("mintCredits", function () {
    it("Should mint credits for a scheme", async function () {
      // First, mint a scheme in SchemeNFT
      await schemeNFT.mintScheme(
        "Solent Wetland Scheme A",
        "SOLENT",
        "Solent marshes - parcel 7",
        50,
        "QmTest123"
      );

      const schemeId = 1;
      const amount = 1000;

      // Mint credits for that scheme
      await schemeCredits.mintCredits(schemeId, recipient.address, amount);

      // Check balance
      expect(await schemeCredits.balanceOf(recipient.address, schemeId)).to.equal(amount);
    });

    it("Should allow minting multiple times to same address", async function () {
      await schemeNFT.mintScheme("Test Scheme", "SOLENT", "Test Location", 50, "QmTest");
      const schemeId = 1;

      await schemeCredits.mintCredits(schemeId, recipient.address, 1000);
      await schemeCredits.mintCredits(schemeId, recipient.address, 500);

      expect(await schemeCredits.balanceOf(recipient.address, schemeId)).to.equal(1500);
    });

    it("Should allow minting to different addresses", async function () {
      await schemeNFT.mintScheme("Test Scheme", "SOLENT", "Test Location", 50, "QmTest");
      const schemeId = 1;
      const [recipient1, recipient2] = await ethers.getSigners();

      await schemeCredits.mintCredits(schemeId, recipient1.address, 1000);
      await schemeCredits.mintCredits(schemeId, recipient2.address, 2000);

      expect(await schemeCredits.balanceOf(recipient1.address, schemeId)).to.equal(1000);
      expect(await schemeCredits.balanceOf(recipient2.address, schemeId)).to.equal(2000);
    });

    it("Should allow minting credits for different schemes", async function () {
      // Mint two schemes
      await schemeNFT.mintScheme("Scheme 1", "SOLENT", "Loc 1", 50, "Qm1");
      await schemeNFT.mintScheme("Scheme 2", "THAMES", "Loc 2", 100, "Qm2");

      const schemeId1 = 1;
      const schemeId2 = 2;

      await schemeCredits.mintCredits(schemeId1, recipient.address, 1000);
      await schemeCredits.mintCredits(schemeId2, recipient.address, 2000);

      expect(await schemeCredits.balanceOf(recipient.address, schemeId1)).to.equal(1000);
      expect(await schemeCredits.balanceOf(recipient.address, schemeId2)).to.equal(2000);
    });

    it("Should only allow owner to mint", async function () {
      await schemeNFT.mintScheme("Test Scheme", "SOLENT", "Test Location", 50, "QmTest");
      const schemeId = 1;

      await expect(
        schemeCredits.connect(recipient).mintCredits(schemeId, recipient.address, 1000)
      ).to.be.revertedWithCustomError(schemeCredits, "OwnableUnauthorizedAccount");
    });
  });
});

