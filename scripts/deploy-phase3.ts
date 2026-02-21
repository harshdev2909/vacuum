/**
 * Deploy Phase 3: Strategy Tokenization & Subscription Infrastructure.
 * Usage: npx hardhat run scripts/deploy-phase3.ts --network arbitrum-sepolia
 */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const treasury = process.env.TREASURY_ADDRESS ?? deployer.address;

  console.log("Deploying Phase 3 with account:", deployer.address);
  console.log("ChainId:", chainId.toString());
  console.log("Treasury:", treasury);

  const StrategyRegistryFactory = await ethers.getContractFactory("StrategyRegistry");
  const registry = await StrategyRegistryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("StrategyRegistry:", registryAddress);

  const StrategyNFTFactory = await ethers.getContractFactory("StrategyNFT");
  const nft = await StrategyNFTFactory.deploy(500);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("StrategyNFT:", nftAddress);

  await registry.setStrategyNFT(nftAddress);
  await nft.setRegistry(registryAddress);
  console.log("Registry <-> NFT linked");

  const RoyaltyDistributorFactory = await ethers.getContractFactory("RoyaltyDistributor");
  const distributor = await RoyaltyDistributorFactory.deploy(treasury, 500, 300, 200);
  await distributor.waitForDeployment();
  console.log("RoyaltyDistributor:", await distributor.getAddress());

  const SubscriptionManagerFactory = await ethers.getContractFactory("StrategySubscriptionManager");
  const subscriptionManager = await SubscriptionManagerFactory.deploy(nftAddress, await distributor.getAddress());
  await subscriptionManager.waitForDeployment();
  console.log("StrategySubscriptionManager:", await subscriptionManager.getAddress());

  const MarketplaceFactory = await ethers.getContractFactory("StrategyMarketplace");
  const marketplace = await MarketplaceFactory.deploy(nftAddress, await distributor.getAddress());
  await marketplace.waitForDeployment();
  console.log("StrategyMarketplace:", await marketplace.getAddress());

  console.log("\n--- Summary ---");
  console.log("StrategyRegistry:", registryAddress);
  console.log("StrategyNFT:", nftAddress);
  console.log("RoyaltyDistributor:", await distributor.getAddress());
  console.log("StrategySubscriptionManager:", await subscriptionManager.getAddress());
  console.log("StrategyMarketplace:", await marketplace.getAddress());
  console.log("\nTo bind ExecutionRouter: router.setStrategyBinding(nft, registry, subscriptionManager)");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
