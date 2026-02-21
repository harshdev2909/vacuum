/**
 * Phase 3 integration: deploy full system, register strategy, subscribe, marketplace buy.
 */
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { StrategyRegistry } from "../../typechain-types";
import { StrategyNFT } from "../../typechain-types";
import { RoyaltyDistributor } from "../../typechain-types";
import { StrategySubscriptionManager } from "../../typechain-types";
import { StrategyMarketplace } from "../../typechain-types";
import { TestERC20 } from "../../typechain-types";

async function deployFullFixture() {
  const [owner, creator, user, buyer] = await ethers.getSigners();
  const StrategyRegistryFactory = await ethers.getContractFactory("StrategyRegistry");
  const registry = await StrategyRegistryFactory.deploy();
  await registry.waitForDeployment();
  const StrategyNFTFactory = await ethers.getContractFactory("StrategyNFT");
  const nft = await StrategyNFTFactory.deploy(500);
  await nft.waitForDeployment();
  await registry.setStrategyNFT(await nft.getAddress());
  await nft.setRegistry(await registry.getAddress());

  const RoyaltyDistributorFactory = await ethers.getContractFactory("RoyaltyDistributor");
  const distributor = await RoyaltyDistributorFactory.deploy(owner.address, 500, 300, 200);
  await distributor.waitForDeployment();
  const SubscriptionManagerFactory = await ethers.getContractFactory("StrategySubscriptionManager");
  const subscriptionManager = await SubscriptionManagerFactory.deploy(await nft.getAddress(), await distributor.getAddress());
  await subscriptionManager.waitForDeployment();
  const MarketplaceFactory = await ethers.getContractFactory("StrategyMarketplace");
  const marketplace = await MarketplaceFactory.deploy(await nft.getAddress(), await distributor.getAddress());
  await marketplace.waitForDeployment();

  const PayTokenFactory = await ethers.getContractFactory("TestERC20");
  const payToken = await PayTokenFactory.deploy("Pay", "PAY", 18);
  await payToken.waitForDeployment();
  await payToken.mint(creator.address, ethers.parseEther("1000"));
  await payToken.mint(user.address, ethers.parseEther("1000"));
  await payToken.mint(buyer.address, ethers.parseEther("1000"));
  await payToken.connect(creator).approve(await subscriptionManager.getAddress(), ethers.MaxUint256);
  await payToken.connect(user).approve(await subscriptionManager.getAddress(), ethers.MaxUint256);
  await payToken.connect(buyer).approve(await marketplace.getAddress(), ethers.MaxUint256);

  const strategyAddr = "0x0000000000000000000000000000000000000001";
  await registry.register(strategyAddr, creator.address, 1, 2, ethers.zeroPadBytes("0x01", 32), "ipfs://meta1");
  const tokenId = 1n;

  return { registry, nft, distributor, subscriptionManager, marketplace, payToken, owner, creator, user, buyer, tokenId };
}

describe("Phase 3 integration", function () {
  it("full flow: register -> subscribe -> list -> buy -> royalties and NFT transfer", async function () {
    const { nft, distributor, subscriptionManager, marketplace, payToken, creator, user, buyer, tokenId } = await loadFixture(deployFullFixture);

    await subscriptionManager.connect(user).subscribe(tokenId, 86400, await payToken.getAddress(), ethers.parseEther("10"));
    expect(await subscriptionManager.isSubscriptionActive(user.address, tokenId)).to.be.true;

    await nft.connect(creator).approve(await marketplace.getAddress(), tokenId);
    await marketplace.connect(creator).list(tokenId, await payToken.getAddress(), ethers.parseEther("20"));

    const creatorClaimBefore = await distributor.claimable(creator.address, await payToken.getAddress());
    await marketplace.connect(buyer).buy(tokenId, ethers.ZeroAddress);

    expect(await nft.ownerOf(tokenId)).to.eq(buyer.address);
    expect(await distributor.claimable(creator.address, await payToken.getAddress())).to.be.gt(creatorClaimBefore);
  });
});
