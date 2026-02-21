/**
 * Deploy Phase 4: DAO Automation (RiskGuard, PolicyEngine, TreasuryAutomationController, BuybackModule, GovernanceExecutorAdapter).
 * Usage: npx hardhat run scripts/deploy-phase4.ts --network <network>
 * Requires: TREASURY_ADDRESS, EXECUTION_ROUTER_ADDRESS (optional, set later via setExecutionRouter).
 */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const treasury = process.env.TREASURY_ADDRESS ?? deployer.address;
  const executionRouter = process.env.EXECUTION_ROUTER_ADDRESS ?? ethers.ZeroAddress;

  console.log("Deploying Phase 4 (DAO Automation) with account:", deployer.address);
  console.log("ChainId:", chainId.toString());
  console.log("Treasury:", treasury);

  const RiskGuardFactory = await ethers.getContractFactory("RiskGuard");
  const riskGuard = await RiskGuardFactory.deploy(deployer.address);
  await riskGuard.waitForDeployment();
  console.log("RiskGuard:", await riskGuard.getAddress());

  const PolicyEngineFactory = await ethers.getContractFactory("PolicyEngine");
  const policyEngine = await PolicyEngineFactory.deploy(deployer.address);
  await policyEngine.waitForDeployment();
  console.log("PolicyEngine:", await policyEngine.getAddress());

  const TreasuryAutomationControllerFactory = await ethers.getContractFactory("TreasuryAutomationController");
  const controller = await TreasuryAutomationControllerFactory.deploy(deployer.address);
  await controller.waitForDeployment();
  await controller.setRiskGuard(await riskGuard.getAddress());
  await controller.setTreasury(treasury);
  if (executionRouter !== ethers.ZeroAddress) {
    await controller.setExecutionRouter(executionRouter);
  }
  await riskGuard.setAutomationController(await controller.getAddress());
  await riskGuard.setMaxDailySpend(ethers.parseEther("100"));
  await riskGuard.setStrategyWhitelisted(executionRouter !== ethers.ZeroAddress ? executionRouter : deployer.address, true);
  console.log("TreasuryAutomationController:", await controller.getAddress());

  const BuybackModuleFactory = await ethers.getContractFactory("BuybackModule");
  const buybackModule = await BuybackModuleFactory.deploy(deployer.address);
  await buybackModule.waitForDeployment();
  await buybackModule.setTreasury(treasury);
  if (executionRouter !== ethers.ZeroAddress) await buybackModule.setExecutionRouter(executionRouter);
  console.log("BuybackModule:", await buybackModule.getAddress());

  const GovernanceExecutorAdapterFactory = await ethers.getContractFactory("GovernanceExecutorAdapter");
  const adapter = await GovernanceExecutorAdapterFactory.deploy(deployer.address);
  await adapter.waitForDeployment();
  console.log("GovernanceExecutorAdapter:", await adapter.getAddress());

  console.log("\n--- Phase 4 Summary ---");
  console.log("RiskGuard:", await riskGuard.getAddress());
  console.log("PolicyEngine:", await policyEngine.getAddress());
  console.log("TreasuryAutomationController:", await controller.getAddress());
  console.log("BuybackModule:", await buybackModule.getAddress());
  console.log("GovernanceExecutorAdapter:", await adapter.getAddress());
  console.log("\nNext: set executor on GovernanceExecutorAdapter (e.g. TimelockController); set ExecutionRouter on controller if not set.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
