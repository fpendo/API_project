import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

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

  // Write addresses to JSON file for Python script to read
  const addresses = {
    SCHEME_NFT_CONTRACT_ADDRESS: schemeNFTAddress,
    SCHEME_CREDITS_CONTRACT_ADDRESS: schemeCreditsAddress,
    PLANNING_LOCK_CONTRACT_ADDRESS: planningLockAddress
  };

  const jsonPath = path.join(__dirname, "..", "backend", "deployment-addresses.json");
  fs.writeFileSync(jsonPath, JSON.stringify(addresses, null, 2));
  console.log(`\nAddresses written to: ${jsonPath}`);

  // Update .env file directly
  const envPath = path.join(__dirname, "..", "backend", ".env");
  updateEnvFile(envPath, addresses);
  console.log(`\n.env file updated: ${envPath}`);
  
  console.log("\n=== Next Steps ===");
  console.log("1. Run: cd backend && python setup_trading_account_approvals.py");
  console.log("   (This sets up ERC-1155 approvals for credit transfers)");
  console.log("2. Restart your backend server");
}

function updateEnvFile(envPath: string, addresses: { [key: string]: string }) {
  let envContent = "";
  const existingVars: { [key: string]: string } = {};

  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
        if (match) {
          const key = match[1];
          // Only keep non-contract-address variables
          if (!addresses.hasOwnProperty(key)) {
            existingVars[key] = match[2];
          }
        } else if (trimmed.startsWith("#")) {
          // Keep comments
          envContent += line + "\n";
        }
      } else if (trimmed.startsWith("#")) {
        envContent += line + "\n";
      }
    }
  }

  // Write updated .env file
  envContent += "# Contract Addresses (auto-updated by deploy script)\n";
  envContent += `SCHEME_NFT_CONTRACT_ADDRESS=${addresses.SCHEME_NFT_CONTRACT_ADDRESS}\n`;
  envContent += `SCHEME_CREDITS_CONTRACT_ADDRESS=${addresses.SCHEME_CREDITS_CONTRACT_ADDRESS}\n`;
  envContent += `PLANNING_LOCK_CONTRACT_ADDRESS=${addresses.PLANNING_LOCK_CONTRACT_ADDRESS}\n`;
  envContent += "\n# Configuration\n";

  // Add other variables
  const otherVars = Object.keys(existingVars).sort();
  for (const key of otherVars) {
    envContent += `${key}=${existingVars[key]}\n`;
  }

  fs.writeFileSync(envPath, envContent);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

