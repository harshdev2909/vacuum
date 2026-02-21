/**
 * Deploy Phase 5: Agent Marketplace (AgentRegistry, AgentStaking, AgentRevenueDistributor, AgentSubscriptionManager).
 * Usage: npx hardhat run scripts/deploy-phase5.ts --network <network>
 * Requires: PROTOCOL_TREASURY (optional), STAKING_TOKEN (optional, for AgentStaking).
 */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const protocolTreasury = process.env.PROTOCOL_TREASURY ?? deployer.address;
  const stakingToken = process.env.STAKING_TOKEN ?? ethers.ZeroAddress;

  console.log("Deploying Phase 5 (Agent Marketplace) with account:", deployer.address);
  console.log("ChainId:", chainId.toString());
  console.log("Protocol treasury:", protocolTreasury);

  const AgentRegistryFactory = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistryFactory.deploy(deployer.address);
  await agentRegistry.waitForDeployment();
  console.log("AgentRegistry:", await agentRegistry.getAddress());

  let agentStakingAddress = ethers.ZeroAddress;
  if (stakingToken !== ethers.ZeroAddress) {
    const AgentStakingFactory = await ethers.getContractFactory("AgentStaking");
    const agentStaking = await AgentStakingFactory.deploy(deployer.address, await agentRegistry.getAddress(), stakingToken);
    await agentStaking.waitForDeployment();
    agentStakingAddress = await agentStaking.getAddress();
    console.log("AgentStaking:", agentStakingAddress);
  }

  const AgentRevenueDistributorFactory = await ethers.getContractFactory("AgentRevenueDistributor");
  const revenueDistributor = await AgentRevenueDistributorFactory.deploy(deployer.address, await agentRegistry.getAddress(), protocolTreasury);
  await revenueDistributor.waitForDeployment();
  console.log("AgentRevenueDistributor:", await revenueDistributor.getAddress());

  const AgentSubscriptionManagerFactory = await ethers.getContractFactory("AgentSubscriptionManager");
  const subscriptionManager = await AgentSubscriptionManagerFactory.deploy(await agentRegistry.getAddress(), await revenueDistributor.getAddress());
  await subscriptionManager.waitForDeployment();
  console.log("AgentSubscriptionManager:", await subscriptionManager.getAddress());

  console.log("\n--- Phase 5 Summary ---");
  console.log("AgentRegistry:", await agentRegistry.getAddress());
  if (agentStakingAddress !== ethers.ZeroAddress) console.log("AgentStaking:", agentStakingAddress);
  console.log("AgentRevenueDistributor:", await revenueDistributor.getAddress());
  console.log("AgentSubscriptionManager:", await subscriptionManager.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
