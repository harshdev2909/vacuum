import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ExecutionRouter } from "../../typechain-types";
import { FeeManager } from "../../typechain-types";
import { ReferralRegistry } from "../../typechain-types";
import { WalletAuthorization } from "../../typechain-types";

describe("ExecutionRouter (unit with mock)", function () {
  const FEE_BPS = 100; // 1%
  const REFERRAL_SPLIT_BPS = 5000; // 50% of fee to referrer
  const MOCK_AMOUNT_OUT = ethers.parseEther("1");

  async function deployFixture() {
    const [owner, treasury, user, referrer] = await ethers.getSigners();
    const FeeManagerFactory = await ethers.getContractFactory("FeeManager");
    const ReferralRegistryFactory = await ethers.getContractFactory("ReferralRegistry");
    const WalletAuthFactory = await ethers.getContractFactory("WalletAuthorization");
    const MockRouterFactory = await ethers.getContractFactory("MockV3Router");
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");

    const fm = await FeeManagerFactory.deploy(treasury.address, FEE_BPS, REFERRAL_SPLIT_BPS);
    const reg = await ReferralRegistryFactory.deploy();
    const walletAuth = await WalletAuthFactory.deploy();
    const mockRouter = await MockRouterFactory.deploy();
    const weth = await ERC20Factory.deploy();
    const tokenOut = await ERC20Factory.deploy();
    await tokenOut.mint(await mockRouter.getAddress(), MOCK_AMOUNT_OUT * 10n);
    await mockRouter.setMockAmountOut(MOCK_AMOUNT_OUT);

    const RouterFactory = await ethers.getContractFactory("ExecutionRouter");
    const router = await RouterFactory.deploy(
      await mockRouter.getAddress(),
      await weth.getAddress(),
      fm,
      reg,
      walletAuth
    );
    await fm.setExecutor(await router.getAddress());
    await reg.setExecutor(await router.getAddress());

    await weth.mint(user.address, ethers.parseEther("100"));
    await tokenOut.mint(await router.getAddress(), 0);
    return { router, fm, reg, walletAuth, mockRouter, weth, tokenOut, owner, treasury, user, referrer };
  }

  describe("executeExactInputSingle", function () {
    it("reverts when paused", async function () {
      const { router, user, weth, tokenOut } = await loadFixture(deployFixture);
      await router.pause();
      const params = {
        tokenIn: await weth.getAddress(),
        tokenOut: await tokenOut.getAddress(),
        fee: 3000,
        recipient: await router.getAddress(),
        amountIn: ethers.parseEther("1"),
        amountOutMinimum: ethers.parseEther("0.5"),
        sqrtPriceLimitX96: 0n,
      };
      await weth.connect(user).approve(await router.getAddress(), ethers.MaxUint256);
      await expect(
        router.connect(user).executeExactInputSingle(
          params,
          Math.floor(Date.now() / 1000) + 3600,
          ethers.ZeroAddress,
          ethers.parseEther("0.5"),
          0
        )
      ).to.be.revertedWithCustomError(router, "EnforcedPause");
    });

    it("reverts when deadline expired", async function () {
      const { router, user, weth, tokenOut } = await loadFixture(deployFixture);
      const params = {
        tokenIn: await weth.getAddress(),
        tokenOut: await tokenOut.getAddress(),
        fee: 3000,
        recipient: await router.getAddress(),
        amountIn: ethers.parseEther("1"),
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      };
      await weth.connect(user).approve(await router.getAddress(), ethers.MaxUint256);
      await expect(
        router.connect(user).executeExactInputSingle(params, 1, ethers.ZeroAddress, 0n, 0)
      ).to.be.revertedWithCustomError(router, "ExecutionRouter__Expired");
    });

    it("reverts when nonce mismatch", async function () {
      const { router, user, weth, tokenOut } = await loadFixture(deployFixture);
      const params = {
        tokenIn: await weth.getAddress(),
        tokenOut: await tokenOut.getAddress(),
        fee: 3000,
        recipient: await router.getAddress(),
        amountIn: ethers.parseEther("1"),
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      };
      await weth.connect(user).approve(await router.getAddress(), ethers.MaxUint256);
      await expect(
        router.connect(user).executeExactInputSingle(
          params,
          Math.floor(Date.now() / 1000) + 3600,
          ethers.ZeroAddress,
          0n,
          1
        )
      ).to.be.revertedWithCustomError(router, "ExecutionRouter__InvalidNonce");
    });

    it("reverts when minAmountOutAfterFee not met", async function () {
      const { router, user, weth, tokenOut } = await loadFixture(deployFixture);
      const params = {
        tokenIn: await weth.getAddress(),
        tokenOut: await tokenOut.getAddress(),
        fee: 3000,
        recipient: await router.getAddress(),
        amountIn: ethers.parseEther("1"),
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      };
      await weth.connect(user).approve(await router.getAddress(), ethers.MaxUint256);
      await expect(
        router.connect(user).executeExactInputSingle(
          params,
          Math.floor(Date.now() / 1000) + 3600,
          ethers.ZeroAddress,
          ethers.parseEther("2"),
          0
        )
      ).to.be.revertedWithCustomError(router, "ExecutionRouter__Slippage");
    });
  });
});
