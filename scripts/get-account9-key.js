const { ethers } = require("hardhat");

async function main() {
  // Hardhat's default mnemonic
  const mnemonic = "test test test test test test test test test test test junk";
  
  // Derive account #9 using the same method Hardhat uses
  const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  const account9Node = hdNode.derivePath("m/44'/60'/0'/0/9");
  
  const address = account9Node.address;
  const privateKey = account9Node.privateKey;
  
  console.log("Derived Account #9:");
  console.log(`  Address: ${address}`);
  console.log(`  Private Key: ${privateKey}`);
  console.log(`  Expected: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720`);
  console.log(`  Match: ${address.toLowerCase() === '0xa0ee7a142d267c1f36714e4a8f75612f20a79720'}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


