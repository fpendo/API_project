import { ethers } from "hardhat";

async function main() {
  console.log("Deploying contracts...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy SchemeNFT
  console.log("\n1. Deploying SchemeNFT...");
  const SchemeNFT = await ethers.getContractFactory("SchemeNFT");
  const schemeNFT = await SchemeNFT.deploy(deployer.address);
  await schemeNFT.waitForDeployment();
  const schemeNFTAddress = await schemeNFT.getAddress();
  console.log("SchemeNFT deployed to:", schemeNFTAddress);

  // Deploy SchemeCredits
  console.log("\n2. Deploying SchemeCredits...");
  const SchemeCredits = await ethers.getContractFactory("SchemeCredits");
  const schemeCredits = await SchemeCredits.deploy(deployer.address, schemeNFTAddress);
  await schemeCredits.waitForDeployment();
  const schemeCreditsAddress = await schemeCredits.getAddress();
  console.log("SchemeCredits deployed to:", schemeCreditsAddress);

  // Deploy PlanningLock
  console.log("\n3. Deploying PlanningLock...");
  const PlanningLock = await ethers.getContractFactory("PlanningLock");
  const planningLock = await PlanningLock.deploy(schemeNFTAddress, schemeCreditsAddress);
  await planningLock.waitForDeployment();
  const planningLockAddress = await planningLock.getAddress();
  console.log("PlanningLock deployed to:", planningLockAddress);

  // Set PlanningLock in SchemeCredits and SchemeNFT
  console.log("\n4. Configuring SchemeCredits and SchemeNFT...");
  const setPlanningTx = await schemeCredits.setPlanningContract(planningLockAddress);
  await setPlanningTx.wait();
  const setPlanningNftTx = await schemeNFT.setPlanningContract(planningLockAddress);
  await setPlanningNftTx.wait();
  console.log("PlanningLock set in SchemeCredits and SchemeNFT");

  console.log("\n=== Deployment Summary ===");
  console.log("SchemeNFT:", schemeNFTAddress);
  console.log("SchemeCredits:", schemeCreditsAddress);
  console.log("PlanningLock:", planningLockAddress);
  console.log("\nSave these addresses to your .env file:");
  console.log(`SCHEME_NFT_CONTRACT_ADDRESS=${schemeNFTAddress}`);
  console.log(`SCHEME_CREDITS_CONTRACT_ADDRESS=${schemeCreditsAddress}`);
  console.log(`PLANNING_LOCK_CONTRACT_ADDRESS=${planningLockAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


