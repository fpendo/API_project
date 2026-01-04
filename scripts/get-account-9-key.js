const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  const account9 = signers[9];
  
  console.log(`Account #9 address: ${account9.address}`);
  console.log(`Expected: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720`);
  console.log(`Match: ${account9.address.toLowerCase() === '0xa0ee7a142d267c1f36714e4a8f75612f20a79720'}`);
  
  // Note: Hardhat doesn't expose private keys directly for security reasons
  // But we can use the signer to make transactions
  console.log("\nTo get the private key, you can:");
  console.log("1. Check Hardhat's account derivation");
  console.log("2. Use the signer directly in scripts (recommended)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


