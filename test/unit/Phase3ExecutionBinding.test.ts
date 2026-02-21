import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ExecutionRouter } from "../../typechain-types";
import { FeeManager } from "../../typechain-types";
import { ReferralRegistry } from "../../typechain-types";
import { WalletAuthorization } from "../../typechain-types";
import { StrategyNFT } from "../../typechain-types";
import { StrategyRegistry } from "../../typechain-types";
import { StrategySubscriptionManager } from "../../typechain-types";
import { RoyaltyDistributor } from "../../typechain-types";
import { TestERC20 } from "../../typechain-types";

const ROUTER = "0x101F443B4d1b059569D643917553c771E1b9663E";
const WETH = "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73";

async function deployFixture() {
  const [owner, treasury, creator, user] = await ethers.getSigners();

  const FeeManagerFactory = await ethers.getContractFactory("FeeManager");
  const feeManager = await FeeManagerFactory.deploy(treasury.address, 50, 5000);
  await feeManager.waitForDeployment();
  const ReferralRegistryFactory = await ethers.getContractFactory("ReferralRegistry");
  const referralRegistry = await ReferralRegistryFactory.deploy();
  await referralRegistry.waitForDeployment();
  const WalletAuthFactory = await ethers.getContractFactory("WalletAuthorization");
  const walletAuth = await WalletAuthFactory.deploy();
  await walletAuth.waitForDeployment();

  const RouterFactory = await ethers.getContractFactory("ExecutionRouter");
  const router = await RouterFactory.deploy(ROUTER, WETH, await feeManager.getAddress(), await referralRegistry.getAddress(), await walletAuth.getAddress());
  await router.waitForDeployment();
  await feeManager.setExecutor(await router.getAddress());
  await referralRegistry.setExecutor(await router.getAddress());

  const StrategyRegistryFactory = await ethers.getContractFactory("StrategyRegistry");
  const registry = await StrategyRegistryFactory.deploy();
  await registry.waitForDeployment();
  const StrategyNFTFactory = await ethers.getContractFactory("StrategyNFT");
  const nft = await StrategyNFTFactory.deploy(500);
  await nft.waitForDeployment();
  await registry.setStrategyNFT(await nft.getAddress());
  await nft.setRegistry(await registry.getAddress());

  const RoyaltyDistributorFactory = await ethers.getContractFactory("RoyaltyDistributor");
  const distributor = await RoyaltyDistributorFactory.deploy(treasury.address, 500, 300, 200);
  await distributor.waitForDeployment();
  const SubscriptionManagerFactory = await ethers.getContractFactory("StrategySubscriptionManager");
  const subscriptionManager = await SubscriptionManagerFactory.deploy(await nft.getAddress(), await distributor.getAddress());
  await subscriptionManager.waitForDeployment();

  await router.setStrategyBinding(nft, registry, subscriptionManager);
  await registry.register("0x0000000000000000000000000000000000000001", creator.address, 1, 2, ethers.zeroPadBytes("0x01", 32), "uri");

  const payToken = await (await ethers.getContractFactory("TestERC20")).deploy("Pay", "PAY", 18);
  await payToken.waitForDeployment();
  await payToken.mint(user.address, ethers.parseEther("1000"));
  await payToken.mint(creator.address, ethers.parseEther("1000"));
  await payToken.connect(user).approve(await subscriptionManager.getAddress(), ethers.MaxUint256);
  await payToken.connect(creator).approve(await subscriptionManager.getAddress(), ethers.MaxUint256);

  return { router, nft, registry, subscriptionManager, owner, creator, user, payToken };
}

describe("ExecutionRouter strategy binding", function () {
  it("reverts when strategyTokenId required but subscription inactive", async function () {
    const { router, nft, creator, user } = await loadFixture(deployFixture);
    await nft.connect(creator).transferFrom(creator.address, user.address, 1n);
    const strategyTokenId = 1n;
    const params = {
      tokenIn: WETH,
      tokenOut: WETH,
      fee: 3000,
      recipient: await router.getAddress(),
      amountIn: ethers.parseEther("0.001"),
      amountOutMinimum: 0n,
      sqrtPriceLimitX96: 0n,
    };
    await expect(
      router.connect(user).executeExactInputSingleWithStrategy(
        params,
        Math.floor(Date.now() / 1000) + 600,
        ethers.ZeroAddress,
        0n,
        await router.executionNonces(user.address),
        strategyTokenId
      )
    ).to.be.revertedWithCustomError(router, "ExecutionRouter__StrategySubscriptionRequired");
  });

  it("reverts when strategyTokenId required but user does not own NFT", async function () {
    const { router, subscriptionManager, payToken, creator, user } = await loadFixture(deployFixture);
    await payToken.mint(creator.address, ethers.parseEther("100"));
    await payToken.connect(creator).approve(await subscriptionManager.getAddress(), ethers.MaxUint256);
    await subscriptionManager.connect(creator).subscribe(1n, 86400, await payToken.getAddress(), ethers.parseEther("10"));
    const params = {
      tokenIn: WETH,
      tokenOut: WETH,
      fee: 3000,
      recipient: await router.getAddress(),
      amountIn: ethers.parseEther("0.001"),
      amountOutMinimum: 0n,
      sqrtPriceLimitX96: 0n,
    };
    await expect(
      router.connect(user).executeExactInputSingleWithStrategy(
        params,
        Math.floor(Date.now() / 1000) + 600,
        ethers.ZeroAddress,
        0n,
        await router.executionNonces(user.address),
        1n
      )
    ).to.be.revertedWithCustomError(router, "ExecutionRouter__StrategyNFTRequired");
  });
});
