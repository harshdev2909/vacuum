import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, impersonateAccount, setBalance } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { RiskGuard } from "../../typechain-types";
import { PolicyEngine } from "../../typechain-types";
import { TreasuryAutomationController } from "../../typechain-types";
import { BuybackModule } from "../../typechain-types";
import { GovernanceExecutorAdapter } from "../../typechain-types";
import { WalletAuthorization } from "../../typechain-types";

async function signDelegateAuth(
  signer: SignerWithAddress,
  owner: string,
  delegate: string,
  nonce: bigint,
  deadline: bigint,
  wa: WalletAuthorization
): Promise<string> {
  const network = await ethers.provider.getNetwork();
  const contractAddress = await wa.getAddress();
  const domain = { name: "ArbiExecutionLayer", version: "1", chainId: Number(network.chainId), verifyingContract: contractAddress };
  const types = {
    DelegateAuthorization: [
      { name: "owner", type: "address" },
      { name: "delegate", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  const value = { owner, delegate, nonce, deadline };
  return await signer.signTypedData(domain, types, value);
}

describe("Phase 4: DAO Automation", function () {
  async function deployPhase4Fixture() {
    const [owner, treasury, keeper] = await ethers.getSigners();
    const RiskGuardFactory = await ethers.getContractFactory("RiskGuard");
    const riskGuard = await RiskGuardFactory.deploy(owner.address);
    await riskGuard.waitForDeployment();
    const PolicyEngineFactory = await ethers.getContractFactory("PolicyEngine");
    const policyEngine = await PolicyEngineFactory.deploy(owner.address);
    await policyEngine.waitForDeployment();
    const ControllerFactory = await ethers.getContractFactory("TreasuryAutomationController");
    const controller = await ControllerFactory.deploy(owner.address);
    await controller.waitForDeployment();
    await controller.setRiskGuard(await riskGuard.getAddress());
    await controller.setTreasury(treasury.address);
    await riskGuard.setAutomationController(await controller.getAddress());
    await riskGuard.setMaxDailySpend(ethers.parseEther("50"));
    await riskGuard.setMaxSlippageBps(500);
    return { riskGuard, policyEngine, controller, owner, treasury, keeper };
  }

  async function deployWithRouterFixture() {
    const [owner, treasury, user] = await ethers.getSigners();
    const FeeManagerFactory = await ethers.getContractFactory("FeeManager");
    const ReferralRegistryFactory = await ethers.getContractFactory("ReferralRegistry");
    const WalletAuthFactory = await ethers.getContractFactory("WalletAuthorization");
    const MockRouterFactory = await ethers.getContractFactory("MockV3Router");
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const fm = await FeeManagerFactory.deploy(treasury.address, 100, 5000);
    const reg = await ReferralRegistryFactory.deploy();
    const walletAuth = await WalletAuthFactory.deploy();
    const mockRouter = await MockRouterFactory.deploy();
    const weth = await ERC20Factory.deploy();
    const tokenOut = await ERC20Factory.deploy();
    await tokenOut.mint(await mockRouter.getAddress(), ethers.parseEther("1000"));
    await mockRouter.setMockAmountOut(ethers.parseEther("1"));
    const RouterFactory = await ethers.getContractFactory("ExecutionRouter");
    const router = await RouterFactory.deploy(await mockRouter.getAddress(), await weth.getAddress(), fm, reg, walletAuth);
    await fm.setExecutor(await router.getAddress());
    await reg.setExecutor(await router.getAddress());
    await weth.mint(treasury.address, ethers.parseEther("100"));
    const RiskGuardFactory = await ethers.getContractFactory("RiskGuard");
    const riskGuard = await RiskGuardFactory.deploy(owner.address);
    await riskGuard.waitForDeployment();
    const ControllerFactory = await ethers.getContractFactory("TreasuryAutomationController");
    const controller = await ControllerFactory.deploy(owner.address);
    await controller.waitForDeployment();
    await controller.setExecutionRouter(await router.getAddress());
    await controller.setRiskGuard(await riskGuard.getAddress());
    await controller.setTreasury(treasury.address);
    await riskGuard.setAutomationController(await controller.getAddress());
    await riskGuard.setMaxDailySpend(ethers.parseEther("50"));
    await riskGuard.setStrategyWhitelisted(await router.getAddress(), true);
    await riskGuard.setMaxSlippageBps(500);
    return { router, riskGuard, controller, owner, treasury, user, weth, tokenOut, walletAuth };
  }

  describe("RiskGuard", function () {
    it("enforces max daily spend", async function () {
      const { riskGuard, controller } = await loadFixture(deployPhase4Fixture);
      await riskGuard.setStrategyWhitelisted(await controller.getAddress(), true);
      expect(await riskGuard.canExecute(await controller.getAddress(), ethers.parseEther("10"))).to.be.true;
      await riskGuard.validateExecution(await controller.getAddress(), ethers.parseEther("10"), ethers.parseEther("0.96"), ethers.parseEther("1"));
      await impersonateAccount(await controller.getAddress());
      await setBalance(await controller.getAddress(), ethers.parseEther("1"));
      const controllerAsSigner = await ethers.getSigner(await controller.getAddress());
      await riskGuard.connect(controllerAsSigner).recordSpend(ethers.parseEther("10"));
      await riskGuard.validateExecution(await controller.getAddress(), ethers.parseEther("40"), ethers.parseEther("0.96"), ethers.parseEther("1"));
      await riskGuard.connect(controllerAsSigner).recordSpend(ethers.parseEther("40"));
      expect(await riskGuard.canExecute(await controller.getAddress(), ethers.parseEther("1"))).to.be.false;
      await expect(riskGuard.validateExecution(await controller.getAddress(), ethers.parseEther("1"), 0n, 0n))
        .to.be.revertedWithCustomError(riskGuard, "RiskGuard__ExceedsDailySpend");
    });

    it("enforces strategy whitelist", async function () {
      const { riskGuard, controller } = await loadFixture(deployPhase4Fixture);
      await expect(riskGuard.validateExecution(ethers.ZeroAddress, 0n, 0n, 0n))
        .to.be.revertedWithCustomError(riskGuard, "RiskGuard__StrategyNotWhitelisted");
    });

    it("enforces pause", async function () {
      const { riskGuard, controller } = await loadFixture(deployPhase4Fixture);
      await riskGuard.setStrategyWhitelisted(await controller.getAddress(), true);
      await riskGuard.pause();
      await expect(riskGuard.validateExecution(await controller.getAddress(), ethers.parseEther("1"), 0n, 0n))
        .to.be.revertedWithCustomError(riskGuard, "RiskGuard__Paused");
    });
  });

  describe("PolicyEngine", function () {
    it("creates rule and triggers", async function () {
      const { policyEngine, owner } = await loadFixture(deployPhase4Fixture);
      const ruleId = ethers.id("rule-1");
      await policyEngine.setRule(ruleId, 0, "0x", 2, 86400);
      expect(await policyEngine.evaluateCondition(ruleId)).to.be.true;
      await expect(policyEngine.triggerRule(ruleId, ethers.toUtf8Bytes("payload")))
        .to.emit(policyEngine, "RuleTriggered")
        .withArgs(ruleId, owner.address, (x: bigint) => x > 0n, ethers.toUtf8Bytes("payload"));
      await policyEngine.triggerRule(ruleId, "0x");
      await expect(policyEngine.triggerRule(ruleId, "0x")).to.be.revertedWithCustomError(policyEngine, "PolicyEngine__ExecutionLimitReached");
    });

    it("TimestampAfter condition", async function () {
      const { policyEngine } = await loadFixture(deployPhase4Fixture);
      const ruleId = ethers.id("rule-2");
      const future = Math.floor(Date.now() / 1000) + 10000;
      await policyEngine.setRule(ruleId, 1, ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [future]), 1, 86400);
      expect(await policyEngine.evaluateCondition(ruleId)).to.be.false;
    });
  });

  describe("TreasuryAutomationController", function () {
    it("executeAutomatedSwap integrates with ExecutionRouter", async function () {
      const { router, controller, treasury, weth, tokenOut, walletAuth } = await loadFixture(deployWithRouterFixture);
      await weth.connect(treasury).approve(await router.getAddress(), ethers.MaxUint256);
      const deadlineAuth = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const nonce = await walletAuth.nonces(treasury.address);
      const sig = await signDelegateAuth(treasury, treasury.address, await controller.getAddress(), nonce, deadlineAuth, walletAuth);
      await walletAuth.authorizeDelegate(treasury.address, await controller.getAddress(), deadlineAuth, sig);
      const params = {
        tokenIn: await weth.getAddress(),
        tokenOut: await tokenOut.getAddress(),
        fee: 3000,
        recipient: await router.getAddress(),
        amountIn: ethers.parseEther("1"),
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      };
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const expectedOut = ethers.parseEther("1");
      const minOut = (expectedOut * 9500n) / 10000n;
      await expect(
        controller.executeAutomatedSwap(params, deadline, minOut, expectedOut)
      ).to.emit(controller, "ExecutionPerformed");
      const out = await controller.executeAutomatedSwap.staticCall(params, deadline, minOut, expectedOut);
      expect(out).to.be.gte(minOut);
    });
  });

  describe("BuybackModule", function () {
    it("creates schedule and enforces nextExecutionTime", async function () {
      const [owner] = await ethers.getSigners();
      const BuybackModuleFactory = await ethers.getContractFactory("BuybackModule");
      const module = await BuybackModuleFactory.deploy(owner.address);
      await module.waitForDeployment();
      await module.setTreasury(owner.address);
      const scheduleId = ethers.id("buyback-1");
      await module.createSchedule(scheduleId, owner.address, owner.address, ethers.parseEther("100"), 5, 3600, 500000);
      const s = await module.getSchedule(scheduleId);
      expect(s.exists).to.be.true;
      expect(s.chunks).to.eq(5n);
      await module.cancelSchedule(scheduleId);
      expect((await module.getSchedule(scheduleId)).cancelled).to.be.true;
    });
  });

  describe("GovernanceExecutorAdapter", function () {
    it("only executor can call execute", async function () {
      const [owner, treasury] = await ethers.getSigners();
      const AdapterFactory = await ethers.getContractFactory("GovernanceExecutorAdapter");
      const adapter = await AdapterFactory.deploy(owner.address);
      await adapter.waitForDeployment();
      await adapter.setExecutor(treasury.address);
      await expect(adapter.connect(owner).execute(owner.address, 0n, "0x")).to.be.revertedWithCustomError(adapter, "GovernanceExecutorAdapter__Unauthorized");
      await adapter.connect(treasury).execute(owner.address, 0n, "0x");
      expect(await adapter.executor()).to.eq(treasury.address);
    });
  });
});
