// const hre = require("hardhat");
// require("dotenv").config();

import hre from "hardhat";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  // Insert your deployment script here (see below)
  // get network details from Hardhat
  const networkName = hre.network.name;
  const networkUrl = hre.network.config.url;
  console.log("Deploying to network", networkName, networkUrl);

  // deploy the token contract
  // - deploy the MockDaiToken only on local testnet
  // - deploy the actual Dai token on testnet
  let DAITokenAddress =
    process.env[`${networkName.toUpperCase()}_NETWORK_DAI_TOKEN_ADDRESS`];
  // If deploying to localhost, (for dev/testing purposes) need to deploy own ERC20
  // if (networkName == "localhost") {
  const ERC20Contract = await hre.ethers.getContractFactory("MockDaiToken");
  const erc20 = await ERC20Contract.deploy();
  await erc20.deployed();
  DAITokenAddress = erc20.address;
  // }

  // deploy the escrow contract
  const EscrowContract = await hre.ethers.getContractFactory("Escrow");
  const escrowContract = await EscrowContract.deploy(DAITokenAddress);
  await escrowContract.deployed();
  console.log("Contracts deployed!");
  // if (networkName == "localhost") {
  console.log("Deployed ERC20 contract address", erc20.address);
  // }
  console.log("Deployed Escrow Contract address", escrowContract.address);
}
// We recommend this pattern to be able to use
// async/await everywhere and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
