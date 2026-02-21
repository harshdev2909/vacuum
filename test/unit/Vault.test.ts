import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Vault } from "../../typechain-types";
import { MockStrategy } from "../../typechain-types";
import { MockStrategyWithHarvest } from "../../typechain-types";
import { TestERC20 } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const BPS = 10_000n;
const PERFORMANCE_FEE_BPS = 1000n; // 10%
const WITHDRAWAL_FEE_BPS = 50n; // 0.5%
const DEPOSIT_CAP = ethers.parseUnits("1000000", 6);

async function deployFixture() {
  const [owner, treasury, user] = await ethers.getSigners();
  const TestERC20Factory = await ethers.getContractFactory("TestERC20");
  const asset = await TestERC20Factory.deploy("Test USDC", "USDC", 6);
  await asset.waitForDeployment();
  await asset.mint(user.address, ethers.parseUnits("100000", 6));

  const VaultFactory = await ethers.getContractFactory("Vault");
  const vault = await VaultFactory.deploy(
    await asset.getAddress(),
    "Test Vault",
    "vUSDC",
    treasury.address,
    DEPOSIT_CAP,
    PERFORMANCE_FEE_BPS,
    WITHDRAWAL_FEE_BPS
  );
  await vault.waitForDeployment();

  const MockStrategyFactory = await ethers.getContractFactory("MockStrategy");
  const strategy = await MockStrategyFactory.deploy(await vault.getAddress(), await asset.getAddress());
  await strategy.waitForDeployment();
  await vault.setStrategy(strategy);

  return { vault, strategy, asset, owner, treasury, user };
}

describe("Vault", function () {
  describe("deposit", function () {
    it("mints shares and sends assets to strategy", async function () {
      const { vault, strategy, asset, user } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", 6);
      await asset.connect(user).approve(await vault.getAddress(), amount);
      const sharesBefore = await vault.balanceOf(user.address);
      await vault.connect(user).deposit(amount, user.address);
      expect(await vault.balanceOf(user.address)).to.be.gt(sharesBefore);
      expect(await vault.totalAssets()).to.eq(amount);
      expect(await strategy.balanceOf()).to.eq(amount);
    });

    it("reverts when deposit exceeds cap", async function () {
      const { vault, asset, user } = await loadFixture(deployFixture);
      const overCap = DEPOSIT_CAP + 1n;
      await asset.connect(user).approve(await vault.getAddress(), overCap);
      await expect(vault.connect(user).deposit(overCap, user.address)).to.be.revertedWithCustomError(vault, "ERC4626ExceededMaxDeposit");
    });

    it("respects maxDeposit", async function () {
      const { vault, asset, user } = await loadFixture(deployFixture);
      await asset.connect(user).mint(user.address, DEPOSIT_CAP);
      const first = ethers.parseUnits("500000", 6);
      await asset.connect(user).approve(await vault.getAddress(), first);
      await vault.connect(user).deposit(first, user.address);
      const max = await vault.maxDeposit(user.address);
      expect(max).to.eq(DEPOSIT_CAP - first);
    });
  });

  describe("withdraw", function () {
    it("burns shares and sends assets to receiver", async function () {
      const { vault, strategy, asset, user } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", 6);
      await asset.connect(user).approve(await vault.getAddress(), amount);
      await vault.connect(user).deposit(amount, user.address);
      const shares = await vault.balanceOf(user.address);
      const assetsBefore = await asset.balanceOf(user.address);
      await vault.connect(user).withdraw(amount, user.address, user.address);
      expect(await asset.balanceOf(user.address)).to.eq(assetsBefore + amount - (amount * WITHDRAWAL_FEE_BPS) / BPS);
      expect(await vault.balanceOf(user.address)).to.eq(0n);
    });

    it("deducts withdrawal fee to treasury", async function () {
      const { vault, asset, user, treasury } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", 6);
      await asset.connect(user).approve(await vault.getAddress(), amount);
      await vault.connect(user).deposit(amount, user.address);
      const treasuryBefore = await asset.balanceOf(treasury.address);
      await vault.connect(user).withdraw(amount, user.address, user.address);
      const expectedFee = (amount * WITHDRAWAL_FEE_BPS) / BPS;
      expect(await asset.balanceOf(treasury.address)).to.eq(treasuryBefore + expectedFee);
    });
  });

  describe("redeem", function () {
    it("burns shares and sends proportional assets", async function () {
      const { vault, asset, user } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", 6);
      await asset.connect(user).approve(await vault.getAddress(), amount);
      await vault.connect(user).deposit(amount, user.address);
      const shares = await vault.balanceOf(user.address);
      await vault.connect(user).redeem(shares, user.address, user.address);
      expect(await vault.balanceOf(user.address)).to.eq(0n);
      expect(await vault.totalSupply()).to.eq(0n);
    });
  });

  describe("share conversion", function () {
    it("convertToShares and convertToAssets are consistent", async function () {
      const { vault, asset, user } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", 6);
      await asset.connect(user).approve(await vault.getAddress(), amount);
      await vault.connect(user).deposit(amount, user.address);
      const shares = await vault.convertToShares(amount);
      const back = await vault.convertToAssets(shares);
      expect(back).to.eq(amount);
    });
  });

  describe("harvest and performance fee", function () {
    async function deployFixtureWithHarvestStrategy() {
      const [owner, treasury, user] = await ethers.getSigners();
      const TestERC20Factory = await ethers.getContractFactory("TestERC20");
      const asset = await TestERC20Factory.deploy("Test USDC", "USDC", 6);
      await asset.waitForDeployment();
      await asset.mint(user.address, ethers.parseUnits("100000", 6));
      const VaultFactory = await ethers.getContractFactory("Vault");
      const vault = await VaultFactory.deploy(
        await asset.getAddress(),
        "Test Vault",
        "vUSDC",
        treasury.address,
        DEPOSIT_CAP,
        PERFORMANCE_FEE_BPS,
        WITHDRAWAL_FEE_BPS
      );
      await vault.waitForDeployment();
      const MockStrategyWithHarvestFactory = await ethers.getContractFactory("MockStrategyWithHarvest");
      const strategy = await MockStrategyWithHarvestFactory.deploy(await vault.getAddress(), await asset.getAddress());
      await strategy.waitForDeployment();
      await vault.setStrategy(strategy);
      return { vault, strategy, asset, owner, treasury, user };
    }

    it("takes performance fee only on profit and sends to treasury", async function () {
      const { vault, strategy, asset, user, treasury } = await loadFixture(deployFixtureWithHarvestStrategy);
      const amount = ethers.parseUnits("1000", 6);
      await asset.connect(user).approve(await vault.getAddress(), amount);
      await vault.connect(user).deposit(amount, user.address);
      const profit = ethers.parseUnits("100", 6);
      await strategy.setSimulatedProfit(profit);
      const treasuryBefore = await asset.balanceOf(treasury.address);
      await vault.harvest();
      const expectedFee = (profit * PERFORMANCE_FEE_BPS) / BPS;
      expect(await asset.balanceOf(treasury.address)).to.eq(treasuryBefore + expectedFee);
      expect(await vault.totalAssets()).to.eq(amount + profit - expectedFee);
    });

    it("emits Harvest with profit, fee, reinvested", async function () {
      const { vault, strategy, asset, user } = await loadFixture(deployFixtureWithHarvestStrategy);
      const amount = ethers.parseUnits("1000", 6);
      await asset.connect(user).approve(await vault.getAddress(), amount);
      await vault.connect(user).deposit(amount, user.address);
      const profit = ethers.parseUnits("100", 6);
      await strategy.setSimulatedProfit(profit);
      await expect(vault.harvest())
        .to.emit(vault, "Harvest")
        .withArgs(profit, (profit * PERFORMANCE_FEE_BPS) / BPS, profit - (profit * PERFORMANCE_FEE_BPS) / BPS);
    });
  });

  describe("strategy migration", function () {
    it("retireStrategyAndSetNew withdraws all and deposits into new strategy", async function () {
      const { vault, strategy, asset, user, owner } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", 6);
      await asset.connect(user).approve(await vault.getAddress(), amount);
      await vault.connect(user).deposit(amount, user.address);
      const MockStrategyFactory = await ethers.getContractFactory("MockStrategy");
      const strategy2 = await MockStrategyFactory.deploy(await vault.getAddress(), await asset.getAddress());
      await strategy2.waitForDeployment();
      await vault.connect(owner).retireStrategyAndSetNew(strategy2);
      expect(await strategy.balanceOf()).to.eq(0n);
      expect(await strategy2.balanceOf()).to.eq(amount);
      expect(await vault.totalAssets()).to.eq(amount);
    });
  });

  describe("pause", function () {
    it("deposit reverts when paused", async function () {
      const { vault, asset, user, owner } = await loadFixture(deployFixture);
      await vault.connect(owner).pause();
      const amount = ethers.parseUnits("100", 6);
      await asset.connect(user).approve(await vault.getAddress(), amount);
      await expect(vault.connect(user).deposit(amount, user.address)).to.be.reverted; // maxDeposit is 0 when paused
    });

    it("withdraw reverts when paused", async function () {
      const { vault, asset, user, owner } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", 6);
      await asset.connect(user).approve(await vault.getAddress(), amount);
      await vault.connect(user).deposit(amount, user.address);
      await vault.connect(owner).pause();
      await expect(vault.connect(user).withdraw(amount, user.address, user.address)).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });
  });

  describe("emergency withdraw from strategy", function () {
    it("owner can emergencyWithdrawFromStrategy", async function () {
      const { vault, strategy, asset, user, owner } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", 6);
      await asset.connect(user).approve(await vault.getAddress(), amount);
      await vault.connect(user).deposit(amount, user.address);
      await vault.connect(owner).emergencyWithdrawFromStrategy();
      expect(await strategy.balanceOf()).to.eq(0n);
      expect(await asset.balanceOf(await vault.getAddress())).to.eq(amount);
    });
  });
});
