import { expect } from "chai";
import { ethers } from "hardhat";
import { SchemeNFT } from "../typechain-types";

describe("SchemeNFT", function () {
  let schemeNFT: SchemeNFT;
  let owner: any;
  let regulator: any;

  beforeEach(async function () {
    [owner, regulator] = await ethers.getSigners();

    const SchemeNFTFactory = await ethers.getContractFactory("SchemeNFT");
    schemeNFT = await SchemeNFTFactory.deploy(owner.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await schemeNFT.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await schemeNFT.name()).to.equal("SchemeNFT");
      expect(await schemeNFT.symbol()).to.equal("SCHEME");
    });
  });

  describe("mintScheme", function () {
    it("Should mint a scheme NFT to owner", async function () {
      const name = "Solent Wetland Scheme A";
      const catchment = "SOLENT";
      const location = "Solent marshes - parcel 7";
      const originalTonnes = 50;
      const ipfsCid = "QmTest123";

      const tx = await schemeNFT.mintScheme(
        name,
        catchment,
        location,
        originalTonnes,
        ipfsCid
      );
      const receipt = await tx.wait();
      
      // Get tokenId from event or by checking nextTokenId
      const tokenId = 1;

      expect(await schemeNFT.ownerOf(tokenId)).to.equal(owner.address);
    });

    it("Should store scheme information correctly", async function () {
      const name = "Solent Wetland Scheme A";
      const catchment = "SOLENT";
      const location = "Solent marshes - parcel 7";
      const originalTonnes = 50;
      const ipfsCid = "QmTest123";

      await schemeNFT.mintScheme(
        name,
        catchment,
        location,
        originalTonnes,
        ipfsCid
      );

      const tokenId = 1;
      const scheme = await schemeNFT.schemes(tokenId);

      expect(scheme.name).to.equal(name);
      expect(scheme.catchment).to.equal(catchment);
      expect(scheme.location).to.equal(location);
      expect(scheme.originalTonnes).to.equal(originalTonnes);
      expect(scheme.remainingTonnes).to.equal(originalTonnes); // Should equal originalTonnes initially
      expect(scheme.ipfsCid).to.equal(ipfsCid);
    });

    it("Should set remainingTonnes equal to originalTonnes on mint", async function () {
      const originalTonnes = 100;

      await schemeNFT.mintScheme(
        "Test Scheme",
        "THAMES",
        "Test Location",
        originalTonnes,
        "QmTest"
      );

      const tokenId = 1;
      const scheme = await schemeNFT.schemes(tokenId);

      expect(scheme.remainingTonnes).to.equal(originalTonnes);
      expect(scheme.remainingTonnes).to.equal(scheme.originalTonnes);
    });

    it("Should only allow owner to mint", async function () {
      await expect(
        schemeNFT.connect(regulator).mintScheme(
          "Test Scheme",
          "SOLENT",
          "Test Location",
          50,
          "QmTest"
        )
      ).to.be.revertedWithCustomError(schemeNFT, "OwnableUnauthorizedAccount");
    });

    it("Should increment tokenId for each new scheme", async function () {
      await schemeNFT.mintScheme("Scheme 1", "SOLENT", "Loc 1", 50, "Qm1");
      await schemeNFT.mintScheme("Scheme 2", "THAMES", "Loc 2", 100, "Qm2");

      expect(await schemeNFT.ownerOf(1)).to.equal(owner.address);
      expect(await schemeNFT.ownerOf(2)).to.equal(owner.address);

      const scheme1 = await schemeNFT.schemes(1);
      const scheme2 = await schemeNFT.schemes(2);

      expect(scheme1.name).to.equal("Scheme 1");
      expect(scheme2.name).to.equal("Scheme 2");
    });
  });
});

