import { expect } from "chai";
import { ethers } from "hardhat";
import { SchemeCredits } from "../typechain-types";
import { SchemeNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SchemeCredits - Locking", function () {
  let schemeCredits: SchemeCredits;
  let schemeNft: SchemeNFT;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let planningContract: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, planningContract] = await ethers.getSigners();

    // Deploy SchemeNFT
    const SchemeNFTFactory = await ethers.getContractFactory("SchemeNFT");
    schemeNft = await SchemeNFTFactory.deploy(owner.address);
    await schemeNft.waitForDeployment();

    // Deploy SchemeCredits
    const SchemeCreditsFactory = await ethers.getContractFactory("SchemeCredits");
    schemeCredits = await SchemeCreditsFactory.deploy(owner.address, await schemeNft.getAddress());
    await schemeCredits.waitForDeployment();

    // Set planning contract (using a mock address for now)
    await schemeCredits.setPlanningContract(planningContract.address);
  });

  it("Should allow transfer of unlocked credits", async function () {
    const schemeId = 1;
    const mintAmount = 1000;
    const transferAmount = 500;

    // Mint credits to user1
    await schemeCredits.mintCredits(schemeId, user1.address, mintAmount);

    // Transfer unlocked credits
    await schemeCredits.connect(user1).safeTransferFrom(
      user1.address,
      user2.address,
      schemeId,
      transferAmount,
      "0x"
    );

    // Verify balances
    expect(await schemeCredits.balanceOf(user1.address, schemeId)).to.equal(mintAmount - transferAmount);
    expect(await schemeCredits.balanceOf(user2.address, schemeId)).to.equal(transferAmount);
  });

  it("Should prevent transfer of locked credits", async function () {
    const schemeId = 1;
    const mintAmount = 1000;
    const lockedAmount = 300;
    const transferAmount = 800; // More than unlocked (1000 - 300 = 700)

    // Mint credits to user1
    await schemeCredits.mintCredits(schemeId, user1.address, mintAmount);

    // Lock some credits (simulating planning contract call)
    // We need to call lockCredits as the planning contract
    await schemeCredits.connect(planningContract).lockCredits(schemeId, user1.address, lockedAmount);

    // Verify locked balance
    expect(await schemeCredits.lockedBalance(schemeId, user1.address)).to.equal(lockedAmount);

    // Try to transfer more than unlocked - should fail
    await expect(
      schemeCredits.connect(user1).safeTransferFrom(
        user1.address,
        user2.address,
        schemeId,
        transferAmount,
        "0x"
      )
    ).to.be.revertedWith("Cannot transfer locked credits");
  });

  it("Should allow transfer of exactly unlocked amount", async function () {
    const schemeId = 1;
    const mintAmount = 1000;
    const lockedAmount = 300;
    const transferAmount = 700; // Exactly unlocked (1000 - 300 = 700)

    // Mint credits to user1
    await schemeCredits.mintCredits(schemeId, user1.address, mintAmount);

    // Lock some credits
    await schemeCredits.connect(planningContract).lockCredits(schemeId, user1.address, lockedAmount);

    // Transfer exactly unlocked amount - should succeed
    await schemeCredits.connect(user1).safeTransferFrom(
      user1.address,
      user2.address,
      schemeId,
      transferAmount,
      "0x"
    );

    // Verify balances
    expect(await schemeCredits.balanceOf(user1.address, schemeId)).to.equal(lockedAmount);
    expect(await schemeCredits.balanceOf(user2.address, schemeId)).to.equal(transferAmount);
  });

  it("Should allow transfer of less than unlocked amount", async function () {
    const schemeId = 1;
    const mintAmount = 1000;
    const lockedAmount = 300;
    const transferAmount = 500; // Less than unlocked (1000 - 300 = 700)

    // Mint credits to user1
    await schemeCredits.mintCredits(schemeId, user1.address, mintAmount);

    // Lock some credits
    await schemeCredits.connect(planningContract).lockCredits(schemeId, user1.address, lockedAmount);

    // Transfer less than unlocked - should succeed
    await schemeCredits.connect(user1).safeTransferFrom(
      user1.address,
      user2.address,
      schemeId,
      transferAmount,
      "0x"
    );

    // Verify balances
    expect(await schemeCredits.balanceOf(user1.address, schemeId)).to.equal(mintAmount - transferAmount);
    expect(await schemeCredits.balanceOf(user2.address, schemeId)).to.equal(transferAmount);
  });

  it("Should allow unlocking credits", async function () {
    const schemeId = 1;
    const mintAmount = 1000;
    const lockedAmount = 300;
    const unlockAmount = 100;

    // Mint and lock credits
    await schemeCredits.mintCredits(schemeId, user1.address, mintAmount);
    await schemeCredits.connect(planningContract).lockCredits(schemeId, user1.address, lockedAmount);

    // Unlock some credits
    await schemeCredits.connect(planningContract).unlockCredits(schemeId, user1.address, unlockAmount);

    // Verify locked balance decreased
    expect(await schemeCredits.lockedBalance(schemeId, user1.address)).to.equal(lockedAmount - unlockAmount);

    // Now should be able to transfer more
    const transferAmount = 800; // Was 700 unlocked, now 800 unlocked
    await schemeCredits.connect(user1).safeTransferFrom(
      user1.address,
      user2.address,
      schemeId,
      transferAmount,
      "0x"
    );

    expect(await schemeCredits.balanceOf(user2.address, schemeId)).to.equal(transferAmount);
  });

  it("Should allow burning locked credits", async function () {
    const schemeId = 1;
    const mintAmount = 1000;
    const lockedAmount = 300;
    const burnAmount = 200;

    // Mint and lock credits
    await schemeCredits.mintCredits(schemeId, user1.address, mintAmount);
    await schemeCredits.connect(planningContract).lockCredits(schemeId, user1.address, lockedAmount);

    // Burn locked credits
    await schemeCredits.connect(planningContract).burnLockedCredits(schemeId, user1.address, burnAmount);

    // Verify balances
    expect(await schemeCredits.balanceOf(user1.address, schemeId)).to.equal(mintAmount - burnAmount);
    expect(await schemeCredits.lockedBalance(schemeId, user1.address)).to.equal(lockedAmount - burnAmount);
  });

  it("Should not prevent minting (from address(0))", async function () {
    const schemeId = 1;
    const mintAmount = 1000;

    // Minting should work even if there are locked balances
    await schemeCredits.mintCredits(schemeId, user1.address, mintAmount);
    await schemeCredits.connect(planningContract).lockCredits(schemeId, user1.address, mintAmount);

    // Should be able to mint more
    await schemeCredits.mintCredits(schemeId, user1.address, mintAmount);
    expect(await schemeCredits.balanceOf(user1.address, schemeId)).to.equal(mintAmount * 2);
  });

  it("Should not prevent self-transfer (from == to)", async function () {
    const schemeId = 1;
    const mintAmount = 1000;
    const lockedAmount = 300;

    // Mint and lock credits
    await schemeCredits.mintCredits(schemeId, user1.address, mintAmount);
    await schemeCredits.connect(planningContract).lockCredits(schemeId, user1.address, lockedAmount);

    // Self-transfer should work (though unusual, it's allowed)
    await schemeCredits.connect(user1).safeTransferFrom(
      user1.address,
      user1.address,
      schemeId,
      mintAmount,
      "0x"
    );

    // Balance should remain the same
    expect(await schemeCredits.balanceOf(user1.address, schemeId)).to.equal(mintAmount);
  });

  it("Should only allow planning contract to lock credits", async function () {
    const schemeId = 1;
    const mintAmount = 1000;

    await schemeCredits.mintCredits(schemeId, user1.address, mintAmount);

    // Non-planning contract should not be able to lock
    await expect(
      schemeCredits.connect(user1).lockCredits(schemeId, user1.address, 100)
    ).to.be.revertedWith("Only planning contract can lock credits");
  });

  it("Should only allow planning contract to unlock credits", async function () {
    const schemeId = 1;
    const mintAmount = 1000;

    await schemeCredits.mintCredits(schemeId, user1.address, mintAmount);
    await schemeCredits.connect(planningContract).lockCredits(schemeId, user1.address, 100);

    // Non-planning contract should not be able to unlock
    await expect(
      schemeCredits.connect(user1).unlockCredits(schemeId, user1.address, 50)
    ).to.be.revertedWith("Only planning contract can unlock credits");
  });

  it("Should only allow planning contract to burn locked credits", async function () {
    const schemeId = 1;
    const mintAmount = 1000;

    await schemeCredits.mintCredits(schemeId, user1.address, mintAmount);
    await schemeCredits.connect(planningContract).lockCredits(schemeId, user1.address, 100);

    // Non-planning contract should not be able to burn
    await expect(
      schemeCredits.connect(user1).burnLockedCredits(schemeId, user1.address, 50)
    ).to.be.revertedWith("Only planning contract can burn locked credits");
  });
});











