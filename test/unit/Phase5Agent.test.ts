import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AgentRegistry } from "../../typechain-types";
import { AgentStaking } from "../../typechain-types";
import { AgentRevenueDistributor } from "../../typechain-types";
import { AgentSubscriptionManager } from "../../typechain-types";
import { TestERC20 } from "../../typechain-types";

describe("Phase 5: Agent Marketplace", function () {
  async function deployPhase5Fixture() {
    const [owner, creator, user, protocolTreasury] = await ethers.getSigners();
    const AgentRegistryFactory = await ethers.getContractFactory("AgentRegistry");
    const registry = await AgentRegistryFactory.deploy(owner.address);
    await registry.waitForDeployment();
    const TestERC20Factory = await ethers.getContractFactory("TestERC20");
    const stakingToken = await TestERC20Factory.deploy("Stake", "STK", 18);
    await stakingToken.waitForDeployment();
    await stakingToken.mint(user.address, ethers.parseEther("10000"));
    const AgentStakingFactory = await ethers.getContractFactory("AgentStaking");
    const staking = await AgentStakingFactory.deploy(owner.address, await registry.getAddress(), await stakingToken.getAddress());
    await staking.waitForDeployment();
    const AgentRevenueDistributorFactory = await ethers.getContractFactory("AgentRevenueDistributor");
    const revenueDistributor = await AgentRevenueDistributorFactory.deploy(owner.address, await registry.getAddress(), protocolTreasury.address);
    await revenueDistributor.waitForDeployment();
    const AgentSubscriptionManagerFactory = await ethers.getContractFactory("AgentSubscriptionManager");
    const subscriptionManager = await AgentSubscriptionManagerFactory.deploy(await registry.getAddress(), await revenueDistributor.getAddress());
    await subscriptionManager.waitForDeployment();
    return { registry, staking, revenueDistributor, subscriptionManager, stakingToken, owner, creator, user, protocolTreasury };
  }

  describe("AgentRegistry", function () {
    it("registers agent and emits AgentRegistered", async function () {
      const { registry, creator } = await loadFixture(deployPhase5Fixture);
      const agentId = ethers.id("agent-1");
      await expect(registry.connect(creator).registerAgent(agentId, "ipfs://meta1"))
        .to.emit(registry, "AgentRegistered")
        .withArgs(agentId, creator.address, "ipfs://meta1", true);
      const a = await registry.getAgent(agentId);
      expect(a.creator).to.eq(creator.address);
      expect(a.active).to.be.true;
      expect(await registry.isActive(agentId)).to.be.true;
    });

    it("only creator can update and deactivate", async function () {
      const { registry, creator, user } = await loadFixture(deployPhase5Fixture);
      const agentId = ethers.id("agent-2");
      await registry.connect(creator).registerAgent(agentId, "ipfs://meta2");
      await expect(registry.connect(user).updateAgent(agentId, "ipfs://other", true))
        .to.be.revertedWithCustomError(registry, "AgentRegistry__NotCreator");
      await registry.connect(creator).updateAgent(agentId, "ipfs://meta2-updated", true);
      await registry.connect(creator).deactivateAgent(agentId);
      expect(await registry.isActive(agentId)).to.be.false;
    });
  });

  describe("AgentStaking", function () {
    it("stake and unstake after lock period", async function () {
      const { registry, staking, stakingToken, creator, user } = await loadFixture(deployPhase5Fixture);
      const agentId = ethers.id("agent-stake");
      await registry.connect(creator).registerAgent(agentId, "ipfs://s");
      await staking.setMinimumStake(agentId, ethers.parseEther("100"));
      await stakingToken.connect(user).approve(await staking.getAddress(), ethers.MaxUint256);
      await staking.connect(user).stake(agentId, ethers.parseEther("200"));
      expect(await staking.stakeOf(agentId, user.address)).to.eq(ethers.parseEther("200"));
      expect(await staking.totalStake(agentId)).to.eq(ethers.parseEther("200"));
      expect(await staking.meetsMinimumStake(agentId)).to.be.true;
      await expect(staking.connect(user).unstake(agentId, ethers.parseEther("50"))).to.be.revertedWithCustomError(staking, "AgentStaking__LockPeriod");
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 3600]);
      await ethers.provider.send("evm_mine", []);
      await staking.connect(user).unstake(agentId, ethers.parseEther("50"));
      expect(await staking.stakeOf(agentId, user.address)).to.eq(ethers.parseEther("150"));
    });

    it("slash reduces total stake", async function () {
      const { registry, staking, stakingToken, creator, user, owner } = await loadFixture(deployPhase5Fixture);
      const agentId = ethers.id("agent-slash");
      await registry.connect(creator).registerAgent(agentId, "ipfs://s");
      await stakingToken.connect(user).approve(await staking.getAddress(), ethers.MaxUint256);
      await staking.connect(user).stake(agentId, ethers.parseEther("100"));
      await staking.connect(owner).slash(agentId, ethers.parseEther("30"));
      expect(await staking.totalStake(agentId)).to.eq(ethers.parseEther("70"));
    });
  });

  describe("AgentRevenueDistributor", function () {
    it("receiveRevenue splits and claimable increases", async function () {
      const { registry, revenueDistributor, creator, user, protocolTreasury } = await loadFixture(deployPhase5Fixture);
      const agentId = ethers.id("agent-rev");
      await registry.connect(creator).registerAgent(agentId, "ipfs://r");
      const TestERC20Factory = await ethers.getContractFactory("TestERC20");
      const usdc = await TestERC20Factory.deploy("USDC", "USDC", 6);
      await usdc.waitForDeployment();
      await usdc.mint(user.address, 1000e6);
      await usdc.connect(user).approve(await revenueDistributor.getAddress(), 1000e6);
      await revenueDistributor.connect(user).receiveRevenue(agentId, await usdc.getAddress(), 1000e6);
      expect(await revenueDistributor.claimable(creator.address, await usdc.getAddress())).to.eq(800e6);
      expect(await revenueDistributor.claimable(protocolTreasury.address, await usdc.getAddress())).to.eq(200e6);
    });

    it("claim withdraws to account and emits RevenueClaimed", async function () {
      const { registry, revenueDistributor, creator, user } = await loadFixture(deployPhase5Fixture);
      const agentId = ethers.id("agent-claim");
      await registry.connect(creator).registerAgent(agentId, "ipfs://c");
      const TestERC20Factory = await ethers.getContractFactory("TestERC20");
      const usdc = await TestERC20Factory.deploy("USDC", "USDC", 6);
      await usdc.mint(user.address, 1000e6);
      await usdc.connect(user).approve(await revenueDistributor.getAddress(), 1000e6);
      await revenueDistributor.connect(user).receiveRevenue(agentId, await usdc.getAddress(), 1000e6);
      const bal = await usdc.balanceOf(creator.address);
      await expect(revenueDistributor.connect(creator).claim(await usdc.getAddress()))
        .to.emit(revenueDistributor, "RevenueClaimed")
        .withArgs(creator.address, await usdc.getAddress(), 800e6);
      expect(await usdc.balanceOf(creator.address)).to.eq(bal + 800n * 10n ** 6n);
    });
  });

  describe("AgentSubscriptionManager", function () {
    it("subscribe and isSubscriptionActive", async function () {
      const { registry, subscriptionManager, creator, user } = await loadFixture(deployPhase5Fixture);
      const agentId = ethers.id("agent-sub");
      await registry.connect(creator).registerAgent(agentId, "ipfs://sub");
      const TestERC20Factory = await ethers.getContractFactory("TestERC20");
      const usdc = await TestERC20Factory.deploy("USDC", "USDC", 6);
      await usdc.mint(user.address, 1000e6);
      await usdc.connect(user).approve(await subscriptionManager.getAddress(), 1000e6);
      await subscriptionManager.connect(user).subscribe(agentId, 86400 * 30, await usdc.getAddress(), 100e6);
      expect(await subscriptionManager.isSubscriptionActive(user.address, agentId)).to.be.true;
      expect(await subscriptionManager.subscriptionExpiry(user.address, agentId)).to.be.gt(BigInt(Math.floor(Date.now() / 1000)));
    });

    it("cancel sets expiry to now", async function () {
      const { registry, subscriptionManager, creator, user } = await loadFixture(deployPhase5Fixture);
      const agentId = ethers.id("agent-cancel");
      await registry.connect(creator).registerAgent(agentId, "ipfs://c");
      const TestERC20Factory = await ethers.getContractFactory("TestERC20");
      const usdc = await TestERC20Factory.deploy("USDC", "USDC", 6);
      await usdc.mint(user.address, 1000e6);
      await usdc.connect(user).approve(await subscriptionManager.getAddress(), 1000e6);
      await subscriptionManager.connect(user).subscribe(agentId, 86400, await usdc.getAddress(), 10e6);
      await subscriptionManager.connect(user).cancel(agentId);
      expect(await subscriptionManager.isSubscriptionActive(user.address, agentId)).to.be.false;
    });
  });
});
