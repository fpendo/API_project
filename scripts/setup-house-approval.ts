import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, "../backend/.env") });

async function main() {
  const schemeCreditsAddress = process.env.SCHEME_CREDITS_CONTRACT_ADDRESS;
  if (!schemeCreditsAddress) {
    throw new Error("SCHEME_CREDITS_CONTRACT_ADDRESS not set in .env");
  }

  const houseAddress = process.env.BROKER_HOUSE_ADDRESS || "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720";
  const regulatorAddress = process.env.REGULATOR_ADDRESS || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat account #0

  console.log("Setting up house address approval...");
  console.log(`House Address: ${houseAddress}`);
  console.log(`Regulator Address: ${regulatorAddress}`);
  console.log(`SchemeCredits Contract: ${schemeCreditsAddress}`);

  // Get signer for house address (account #9)
  const signers = await ethers.getSigners();
  const houseSigner = signers[9]; // Account #9

  if (houseSigner.address.toLowerCase() !== houseAddress.toLowerCase()) {
    throw new Error(`House address mismatch! Expected ${houseAddress}, got ${houseSigner.address}`);
  }

  // Get SchemeCredits contract
  const SchemeCredits = await ethers.getContractAt(
    "SchemeCredits",
    schemeCreditsAddress,
    houseSigner
  );

  // Check current approval
  const isApproved = await SchemeCredits.isApprovedForAll(houseAddress, regulatorAddress);
  if (isApproved) {
    console.log("✓ Regulator already approved by house address");
    return;
  }

  // Set approval
  console.log("Setting approval...");
  const tx = await SchemeCredits.setApprovalForAll(regulatorAddress, true);
  console.log(`Transaction hash: ${tx.hash}`);
  
  await tx.wait();
  console.log("✓ Approval set successfully!");

  // Verify
  const isApprovedNow = await SchemeCredits.isApprovedForAll(houseAddress, regulatorAddress);
  if (isApprovedNow) {
    console.log("✓ Approval verified");
  } else {
    console.log("✗ Approval verification failed");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

