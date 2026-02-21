import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { StrategyNFT } from "../../typechain-types";
import { StrategyRegistry } from "../../typechain-types";
import { RoyaltyDistributor } from "../../typechain-types";
import { StrategySubscriptionManager } from "../../typechain-types";
import { TestERC20 } from "../../typechain-types";

async function deployFixture() {
  const [owner, creator, user] = await ethers.getSigners();
  const StrategyRegistryFactory = await ethers.getContractFactory("StrategyRegistry");
  const registry = await StrategyRegistryFactory.deploy();
  await registry.waitForDeployment();
  const StrategyNFTFactory = await ethers.getContractFactory("StrategyNFT");
  const nft = await StrategyNFTFactory.deploy(500);
  await nft.waitForDeployment();
  await registry.setStrategyNFT(await nft.getAddress());
  await nft.setRegistry(await registry.getAddress());

  const RoyaltyDistributorFactory = await ethers.getContractFactory("RoyaltyDistributor");
  const distributor = await RoyaltyDistributorFactory.deploy(owner.address, 800, 100, 100);
  await distributor.waitForDeployment();

  const SubscriptionManagerFactory = await ethers.getContractFactory("StrategySubscriptionManager");
  const subscriptionManager = await SubscriptionManagerFactory.deploy(await nft.getAddress(), await distributor.getAddress());
  await subscriptionManager.waitForDeployment();

  await registry.register("0x0000000000000000000000000000000000000001", creator.address, 1, 2, ethers.zeroPadBytes("0x01", 32), "uri");
  const tokenId = 1n;

  const TestERC20Factory = await ethers.getContractFactory("TestERC20");
  const payToken = await TestERC20Factory.deploy("Pay", "PAY", 18);
  await payToken.waitForDeployment();
  await payToken.mint(user.address, ethers.parseEther("1000"));
  await payToken.connect(user).approve(await subscriptionManager.getAddress(), ethers.MaxUint256);

  return { nft, registry, distributor, subscriptionManager, payToken, owner, creator, user, tokenId };
}

describe("StrategySubscriptionManager", function () {
  it("subscribe sets expiry and emits SubscriptionCreated", async function () {
    const { subscriptionManager, payToken, user, tokenId } = await loadFixture(deployFixture);
    const amount = ethers.parseEther("10");
    const duration = 30 * 24 * 3600;
    const tx = await subscriptionManager.connect(user).subscribe(tokenId, duration, await payToken.getAddress(), amount);
    const block = await ethers.provider.getBlock("latest");
    const expectedExpiry = BigInt(block!.timestamp + duration);
    await expect(tx).to.emit(subscriptionManager, "SubscriptionCreated").withArgs(user.address, tokenId, (v: bigint) => v >= expectedExpiry - 2n && v <= expectedExpiry + 2n, await payToken.getAddress(), amount);
    expect(await subscriptionManager.isSubscriptionActive(user.address, tokenId)).to.be.true;
  });

  it("cancel sets expiry to past", async function () {
    const { subscriptionManager, payToken, user, tokenId } = await loadFixture(deployFixture);
    await subscriptionManager.connect(user).subscribe(tokenId, 86400, await payToken.getAddress(), ethers.parseEther("1"));
    await subscriptionManager.connect(user).cancel(tokenId);
    expect(await subscriptionManager.isSubscriptionActive(user.address, tokenId)).to.be.false;
  });

  it("isSubscriptionActive false after expiry", async function () {
    const { subscriptionManager, payToken, user, tokenId } = await loadFixture(deployFixture);
    await subscriptionManager.connect(user).subscribe(tokenId, 1, await payToken.getAddress(), ethers.parseEther("1"));
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    expect(await subscriptionManager.isSubscriptionActive(user.address, tokenId)).to.be.false;
  });
});
