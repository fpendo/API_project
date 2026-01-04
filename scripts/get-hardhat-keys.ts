import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  
  console.log("Hardhat Account Private Keys:\n");
  
  for (let i = 0; i < 20; i++) {
    const signer = signers[i];
    // Note: Hardhat doesn't expose private keys directly for security
    // But we can use the signer to make transactions
    console.log(`Account #${i}: ${signer.address}`);
    
    if (signer.address.toLowerCase() === "0xa0ee7a142d267c1f36714e4a8f75612f20a79720") {
      console.log(`  ^^^ This is the house address (account #9)`);
    }
  }
  
  console.log("\nTo get private keys, check Hardhat's account derivation.");
  console.log("Hardhat uses mnemonic: 'test test test test test test test test test test test junk'");
  console.log("Account #9 address: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


