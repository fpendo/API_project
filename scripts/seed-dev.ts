import { ethers } from "hardhat";

// Contract addresses - update these after running deploy.ts
const SCHEME_NFT_ADDRESS = process.env.SCHEME_NFT_CONTRACT_ADDRESS || "";
const SCHEME_CREDITS_ADDRESS = process.env.SCHEME_CREDITS_CONTRACT_ADDRESS || "";

async function main() {
  console.log("Seeding demo data...");

  if (!SCHEME_NFT_ADDRESS || !SCHEME_CREDITS_ADDRESS) {
    console.error("Error: Contract addresses not set. Please set SCHEME_NFT_CONTRACT_ADDRESS and SCHEME_CREDITS_CONTRACT_ADDRESS environment variables.");
    console.error("Or update the addresses in this script after running deploy.ts");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Get contracts
  const SchemeNFT = await ethers.getContractFactory("SchemeNFT");
  const schemeNFT = SchemeNFT.attach(SCHEME_NFT_ADDRESS);

  const SchemeCredits = await ethers.getContractFactory("SchemeCredits");
  const schemeCredits = SchemeCredits.attach(SCHEME_CREDITS_ADDRESS);

  // Demo landowner address (from seed.py: 0x1111111111111111111111111111111111111111)
  const landownerAddress = "0x1111111111111111111111111111111111111111";

  // Mint Scheme 1: Solent Wetland A
  console.log("\n1. Minting Scheme 1: Solent Wetland A...");
  const tokenId1 = await schemeNFT.mintScheme(
    "Solent Wetland A",
    "SOLENT",
    "Solent marshes – parcel 7",
    50, // 50 tonnes
    "QmDemo1" // Placeholder IPFS CID
  );
  console.log("  Scheme NFT Token ID:", tokenId1.toString());

  // Mint credits for Scheme 1 (50 tonnes = 5,000,000 credits)
  const credits1 = ethers.parseUnits("5000000", 0); // 50 * 100,000
  console.log("  Minting", credits1.toString(), "credits to", landownerAddress);
  const mintTx1 = await schemeCredits.mintCredits(tokenId1, landownerAddress, credits1);
  await mintTx1.wait();
  console.log("  ✓ Credits minted");

  // Mint Scheme 2: Solent Wetland B
  console.log("\n2. Minting Scheme 2: Solent Wetland B...");
  const tokenId2 = await schemeNFT.mintScheme(
    "Solent Wetland B",
    "SOLENT",
    "Solent floodplain",
    30, // 30 tonnes
    "QmDemo2" // Placeholder IPFS CID
  );
  console.log("  Scheme NFT Token ID:", tokenId2.toString());

  // Mint credits for Scheme 2 (30 tonnes = 3,000,000 credits)
  const credits2 = ethers.parseUnits("3000000", 0); // 30 * 100,000
  console.log("  Minting", credits2.toString(), "credits to", landownerAddress);
  const mintTx2 = await schemeCredits.mintCredits(tokenId2, landownerAddress, credits2);
  await mintTx2.wait();
  console.log("  ✓ Credits minted");

  // Mint Scheme 3: Thames Wetland (for different catchment demo)
  console.log("\n3. Minting Scheme 3: Thames Wetland...");
  const tokenId3 = await schemeNFT.mintScheme(
    "Thames Wetland",
    "THAMES",
    "Thames Valley",
    40, // 40 tonnes
    "QmDemo3" // Placeholder IPFS CID
  );
  console.log("  Scheme NFT Token ID:", tokenId3.toString());

  // Mint credits for Scheme 3 (40 tonnes = 4,000,000 credits)
  const credits3 = ethers.parseUnits("4000000", 0); // 40 * 100,000
  console.log("  Minting", credits3.toString(), "credits to", landownerAddress);
  const mintTx3 = await schemeCredits.mintCredits(tokenId3, landownerAddress, credits3);
  await mintTx3.wait();
  console.log("  ✓ Credits minted");

  console.log("\n=== Seed Summary ===");
  console.log("Minted 3 schemes:");
  console.log(`  Scheme 1 (Token ID ${tokenId1}): Solent Wetland A - 50 tonnes`);
  console.log(`  Scheme 2 (Token ID ${tokenId2}): Solent Wetland B - 30 tonnes`);
  console.log(`  Scheme 3 (Token ID ${tokenId3}): Thames Wetland - 40 tonnes`);
  console.log(`All credits minted to: ${landownerAddress}`);
  console.log("\nNote: These token IDs should be recorded in the backend database when schemes are approved.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

