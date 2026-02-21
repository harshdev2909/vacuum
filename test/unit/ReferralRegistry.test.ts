import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ReferralRegistry } from "../../typechain-types";

describe("ReferralRegistry", function () {
  async function deployFixture() {
    const [owner, executor, user, referrer, other] = await ethers.getSigners();
    const ReferralRegistryFactory = await ethers.getContractFactory("ReferralRegistry");
    const reg = await ReferralRegistryFactory.deploy();
    return { reg, owner, executor, user, referrer, other };
  }

  describe("registerReferrer", function () {
    it("registers referrer and emits", async function () {
      const { reg, user, referrer } = await loadFixture(deployFixture);
      await expect(reg.connect(user).registerReferrer(referrer.address))
        .to.emit(reg, "ReferralRegistered")
        .withArgs(user.address, referrer.address);
      expect(await reg.referrerOf(user.address)).to.eq(referrer.address);
    });

    it("reverts on self-referral", async function () {
      const { reg, user } = await loadFixture(deployFixture);
      await expect(reg.connect(user).registerReferrer(user.address))
        .to.be.revertedWithCustomError(reg, "ReferralRegistry__SelfReferral");
    });

    it("reverts on zero referrer", async function () {
      const { reg, user } = await loadFixture(deployFixture);
      await expect(reg.connect(user).registerReferrer(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(reg, "ReferralRegistry__ZeroAddress");
    });

    it("reverts when already bound", async function () {
      const { reg, user, referrer, other } = await loadFixture(deployFixture);
      await reg.connect(user).registerReferrer(referrer.address);
      await expect(reg.connect(user).registerReferrer(other.address))
        .to.be.revertedWithCustomError(reg, "ReferralRegistry__AlreadyBound");
    });
  });

  describe("creditReward and setExecutor", function () {
    it("only executor can credit reward", async function () {
      const { reg, owner, executor, referrer } = await loadFixture(deployFixture);
      await reg.setExecutor(executor.address);
      await expect(reg.connect(executor).creditReward(referrer.address, referrer.address, 1000))
        .to.emit(reg, "ReferralRewardAccrued")
        .withArgs(referrer.address, referrer.address, 1000);
      expect(await reg.earnings(referrer.address, referrer.address)).to.eq(1000);
    });

    it("reverts when non-executor credits", async function () {
      const { reg, user, referrer } = await loadFixture(deployFixture);
      await expect(reg.connect(user).creditReward(referrer.address, referrer.address, 1000))
        .to.be.revertedWithCustomError(reg, "ReferralRegistry__NotExecutor");
    });
  });

  describe("claimRewards", function () {
    it("reverts when zero balance", async function () {
      const { reg, referrer } = await loadFixture(deployFixture);
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const token = await ERC20Mock.deploy();
      await expect(reg.connect(referrer).claimRewards(await token.getAddress(), referrer.address))
        .to.be.revertedWithCustomError(reg, "ReferralRegistry__ZeroAmount");
    });

    it("claims to self when to is zero address", async function () {
      const { reg, owner, executor, referrer } = await loadFixture(deployFixture);
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const token = await ERC20Mock.deploy();
      const regAddr = await reg.getAddress();
      const tokenAddr = await token.getAddress();
      await token.mint(regAddr, 1000);
      await reg.setExecutor(executor.address);
      await reg.connect(executor).creditReward(referrer.address, tokenAddr, 1000);
      await expect(reg.connect(referrer).claimRewards(tokenAddr, ethers.ZeroAddress))
        .to.emit(reg, "ReferralRewardClaimed")
        .withArgs(referrer.address, tokenAddr, 1000, referrer.address);
      expect(await token.balanceOf(referrer.address)).to.eq(1000);
      expect(await reg.earnings(referrer.address, tokenAddr)).to.eq(0);
    });
  });
});
