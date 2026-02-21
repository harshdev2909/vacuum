/**
 * Fork integration tests. Run with FORK_MAINNET=1 for Arbitrum One fork (real USDC/WETH pools).
 * Example: FORK_MAINNET=1 npx hardhat test test/integration/ExecutionRouter.fork.test.ts
 */
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ExecutionRouter } from "../../typechain-types";
import { FeeManager } from "../../typechain-types";
import { ReferralRegistry } from "../../typechain-types";
import { WalletAuthorization } from "../../typechain-types";

const ARBITRUM_ONE = {
  swapRouter02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
  weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
};

const ARBITRUM_SEPOLIA = {
  weth: "0x980B62Da83eFf3D4576C6477b4381A595Fc7B639",
};

describe("ExecutionRouter (fork integration)", function () {
  this.timeout(120_000);

  async function deployFixture() {
    const [owner, treasury, user, referrer] = await ethers.getSigners();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const routerAddr = Number(chainId) === 42161 ? ARBITRUM_ONE.swapRouter02 : "0x101F443B4d1b059569D643917553c771E1b9663E";
    const wethAddr =
      Number(chainId) === 42161
        ? ethers.getAddress(ARBITRUM_ONE.weth)
        : ethers.getAddress(ARBITRUM_SEPOLIA.weth.toLowerCase());

    const FeeManagerFactory = await ethers.getContractFactory("FeeManager");
    const ReferralRegistryFactory = await ethers.getContractFactory("ReferralRegistry");
    const WalletAuthFactory = await ethers.getContractFactory("WalletAuthorization");
    const RouterFactory = await ethers.getContractFactory("ExecutionRouter");

    const fm = await FeeManagerFactory.deploy(treasury.address, 50, 5000);
    const reg = await ReferralRegistryFactory.deploy();
    const walletAuth = await WalletAuthFactory.deploy();
    const router = await RouterFactory.deploy(routerAddr, wethAddr, await fm.getAddress(), await reg.getAddress(), await walletAuth.getAddress());
    await fm.setExecutor(await router.getAddress());
    await reg.setExecutor(await router.getAddress());

    const erc20Abi = ["function balanceOf(address) view returns (uint256)", "function approve(address,uint256) returns (bool)"];
    const weth = await ethers.getContractAt(erc20Abi, wethAddr);
    const usdcAddr = ethers.getAddress(ARBITRUM_ONE.usdc.toLowerCase());
    const usdc = await ethers.getContractAt(erc20Abi, usdcAddr);

    return { router, fm, reg, walletAuth, weth, usdc, owner, treasury, user, referrer, chainId, wethAddr, usdcAddr };
  }

  async function fundUserWithEth(user: { address: string }, amount: bigint) {
    await ethers.provider.send("hardhat_setBalance", [user.address, "0x" + (amount + 10n ** 21n).toString(16)]);
  }

  describe("ETH -> USDC (exact input single)", function () {
    it("swaps ETH for USDC, deducts fee, sends to user", async function () {
      const { router, fm, reg, treasury, user, weth, usdc, wethAddr, usdcAddr } = await loadFixture(deployFixture);
      const chainId = (await ethers.provider.getNetwork()).chainId;
      if (Number(chainId) !== 42161) {
        console.log("Skipping fork test: not on Arbitrum One fork (set FORK_MAINNET=1)");
        return;
      }
      await fundUserWithEth(user, ethers.parseEther("1"));
      const amountIn = ethers.parseEther("0.01");
      const amountOutMinimum = 0n;
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const usdcBefore = await usdc.balanceOf(user.address);
      const treasuryBefore = await usdc.balanceOf(treasury.address);

      const params = {
        tokenIn: wethAddr,
        tokenOut: usdcAddr,
        fee: 3000,
        recipient: await router.getAddress(),
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      };

      const tx = await router.connect(user).executeExactInputSingle(
        params,
        deadline,
        ethers.ZeroAddress,
        0n,
        0,
        { value: amountIn }
      );
      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      const usdcAfter = await usdc.balanceOf(user.address);
      const treasuryAfter = await usdc.balanceOf(treasury.address);
      expect(usdcAfter > usdcBefore).to.be.true;
      expect(treasuryAfter >= treasuryBefore).to.be.true;
    });
  });

  describe("USDC -> WETH (exact input single)", function () {
    it("swaps USDC for WETH when user has USDC", async function () {
      const { router, user, weth, usdc, wethAddr, usdcAddr } = await loadFixture(deployFixture);
      const chainId = (await ethers.provider.getNetwork()).chainId;
      if (Number(chainId) !== 42161) return;

      const amountIn = 100n * 10n ** 6n;
      const usdcBalance = await usdc.balanceOf(user.address);
      if (usdcBalance < amountIn) {
        console.log("Skipping: user has no USDC on fork. Impersonate a whale or fund.");
        return;
      }

      await usdc.connect(user).approve(await router.getAddress(), amountIn);
      const wethBefore = await weth.balanceOf(user.address);
      const params = {
        tokenIn: usdcAddr,
        tokenOut: wethAddr,
        fee: 3000,
        recipient: await router.getAddress(),
        amountIn,
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      };
      await router.connect(user).executeExactInputSingle(
        params,
        Math.floor(Date.now() / 1000) + 3600,
        ethers.ZeroAddress,
        0n,
        0
      );
      const wethAfter = await weth.balanceOf(user.address);
      expect(wethAfter > wethBefore).to.be.true;
    });
  });

  describe("slippage and referral", function () {
    it("reverts when amountOutMinimum too high", async function () {
      const { router, user, wethAddr, usdcAddr } = await loadFixture(deployFixture);
      const chainId = (await ethers.provider.getNetwork()).chainId;
      if (Number(chainId) !== 42161) return;
      await fundUserWithEth(user, ethers.parseEther("1"));
      const params = {
        tokenIn: wethAddr,
        tokenOut: usdcAddr,
        fee: 3000,
        recipient: await router.getAddress(),
        amountIn: ethers.parseEther("0.01"),
        amountOutMinimum: ethers.parseUnits("1000000", 6),
        sqrtPriceLimitX96: 0n,
      };
      await expect(
        router.connect(user).executeExactInputSingle(
          params,
          Math.floor(Date.now() / 1000) + 3600,
          ethers.ZeroAddress,
          0n,
          0,
          { value: params.amountIn }
        )
      ).to.be.reverted;
    });

    it("allocates referral reward when user has referrer", async function () {
      const { router, fm, reg, user, referrer, wethAddr, usdcAddr } = await loadFixture(deployFixture);
      const chainId = (await ethers.provider.getNetwork()).chainId;
      if (Number(chainId) !== 42161) return;
      await reg.connect(user).registerReferrer(referrer.address);
      await fundUserWithEth(user, ethers.parseEther("1"));
      const params = {
        tokenIn: wethAddr,
        tokenOut: usdcAddr,
        fee: 3000,
        recipient: await router.getAddress(),
        amountIn: ethers.parseEther("0.01"),
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      };
      await router.connect(user).executeExactInputSingle(
        params,
        Math.floor(Date.now() / 1000) + 3600,
        ethers.ZeroAddress,
        0n,
        0,
        { value: params.amountIn }
      );
      const earned = await reg.earnings(referrer.address, usdcAddr);
      expect(earned > 0n).to.be.true;
    });
  });
});
