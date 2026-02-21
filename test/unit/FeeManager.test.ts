import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { FeeManager } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("FeeManager", function () {
  const PROTOCOL_FEE_BPS = 50; // 0.5%
  const REFERRAL_SPLIT_BPS = 5000; // 50% of fee to referrer

  async function deployFixture() {
    const [owner, treasury, executor, user] = await ethers.getSigners();
    const FeeManagerFactory = await ethers.getContractFactory("FeeManager");
    const fm = await FeeManagerFactory.deploy(treasury.address, PROTOCOL_FEE_BPS, REFERRAL_SPLIT_BPS);
    return { fm, owner, treasury, executor, user };
  }

  describe("constructor and config", function () {
    it("reverts on zero treasury", async function () {
      const { fm } = await loadFixture(deployFixture);
      const FeeManagerFactory = await ethers.getContractFactory("FeeManager");
      await expect(
        FeeManagerFactory.deploy(ethers.ZeroAddress, 50, 5000)
      ).to.be.revertedWithCustomError(fm, "FeeManager__ZeroAddress");
    });

    it("reverts when protocol fee exceeds max", async function () {
      const { fm } = await loadFixture(deployFixture);
      const [owner, treasury] = await ethers.getSigners();
      const FeeManagerFactory = await ethers.getContractFactory("FeeManager");
      await expect(
        FeeManagerFactory.deploy(treasury.address, 201, 5000)
      ).to.be.revertedWithCustomError(fm, "FeeManager__FeeExceedsMax");
    });

    it("reverts when referral split exceeds 100%", async function () {
      const { fm } = await loadFixture(deployFixture);
      const [owner, treasury] = await ethers.getSigners();
      const FeeManagerFactory = await ethers.getContractFactory("FeeManager");
      await expect(
        FeeManagerFactory.deploy(treasury.address, 50, 10001)
      ).to.be.revertedWithCustomError(fm, "FeeManager__ReferralSplitExceedsMax");
    });

    it("sets treasury and fee config", async function () {
      const { fm, treasury } = await loadFixture(deployFixture);
      expect(await fm.treasury()).to.eq(treasury.address);
      expect(await fm.protocolFeeBps()).to.eq(PROTOCOL_FEE_BPS);
      expect(await fm.referralSplitBps()).to.eq(REFERRAL_SPLIT_BPS);
    });
  });

  describe("setFeeConfig", function () {
    it("updates fee config as owner", async function () {
      const { fm, owner } = await loadFixture(deployFixture);
      await expect(fm.setFeeConfig(100, 3000))
        .to.emit(fm, "FeeConfigUpdated")
        .withArgs(100, 3000);
      expect(await fm.protocolFeeBps()).to.eq(100);
      expect(await fm.referralSplitBps()).to.eq(3000);
    });

    it("reverts when fee exceeds max", async function () {
      const { fm } = await loadFixture(deployFixture);
      await expect(fm.setFeeConfig(201, 5000)).to.be.revertedWithCustomError(fm, "FeeManager__FeeExceedsMax");
    });

    it("reverts when not owner", async function () {
      const { fm, user } = await loadFixture(deployFixture);
      await expect(fm.connect(user).setFeeConfig(100, 3000)).to.be.revertedWithCustomError(fm, "OwnableUnauthorizedAccount");
    });
  });

  describe("setTreasury", function () {
    it("updates treasury and emits", async function () {
      const { fm, owner, user } = await loadFixture(deployFixture);
      await expect(fm.setTreasury(user.address))
        .to.emit(fm, "TreasuryUpdated");
      expect(await fm.treasury()).to.eq(user.address);
    });

    it("reverts on zero address", async function () {
      const { fm } = await loadFixture(deployFixture);
      await expect(fm.setTreasury(ethers.ZeroAddress)).to.be.revertedWithCustomError(fm, "FeeManager__ZeroAddress");
    });
  });

  describe("setExecutor and recordFeeCollected", function () {
    it("only executor can record fee", async function () {
      const { fm, owner, executor, user } = await loadFixture(deployFixture);
      await fm.setExecutor(executor.address);
      await expect(fm.connect(executor).recordFeeCollected(user.address, user.address, 1000, 500))
        .to.emit(fm, "FeeCollected")
        .withArgs(user.address, user.address, 1000, 500);
      expect(await fm.totalFeesCollected(user.address)).to.eq(1000);
    });

    it("reverts when non-executor records", async function () {
      const { fm, user } = await loadFixture(deployFixture);
      await expect(fm.connect(user).recordFeeCollected(user.address, user.address, 1000, 500))
        .to.be.revertedWithCustomError(fm, "FeeManager__NotExecutor");
    });
  });

  describe("computeProtocolFee and computeReferralShare", function () {
    it("computes fee and referral share correctly", async function () {
      const { fm } = await loadFixture(deployFixture);
      // 10000 * 50 / 10000 = 50
      expect(await fm.computeProtocolFee(10000)).to.eq(50);
      // 50 * 5000 / 10000 = 25
      expect(await fm.computeReferralShare(50)).to.eq(25);
    });
  });

  describe("withdrawToTreasury", function () {
    it("reverts on zero amount", async function () {
      const { fm, user } = await loadFixture(deployFixture);
      const token = user.address; // use address as "token" for test
      await expect(fm.withdrawToTreasury(token, 0)).to.be.revertedWithCustomError(fm, "FeeManager__ZeroAmount");
    });
  });
});
