/**
 * Example: Simple buyback bot using DaoAutomationAgent.
 * Validates policy rule and RiskGuard, then triggers rule with payload.
 *
 * Run: PRIVATE_KEY=0x... RULE_ID=0x... npx ts-node examples/SimpleBuybackBot.ts
 */

import { ArbiClient } from "vacuum-sdk";
import { DaoAutomationAgent } from "../src";
import { JsonRpcProvider, Wallet } from "ethers";

const RPC = process.env.RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
const CHAIN_ID = Number(process.env.CHAIN_ID ?? "421614");
const RULE_ID = process.env.RULE_ID ?? "0x0000000000000000000000000000000000000000000000000000000000000000";

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error("Set PRIVATE_KEY");
    process.exit(1);
  }

  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(pk, provider);
  const client = new ArbiClient({
    rpcUrl: RPC,
    chainId: CHAIN_ID,
    signer: wallet,
  });

  const agent = new DaoAutomationAgent({
    client,
    dryRun: process.env.DRY_RUN === "true",
    ruleId: RULE_ID,
  });

  const status = await client.dao.getPolicyStatus();
  console.log("RiskGuard paused:", status.paused);
  console.log("Current day spend:", status.currentDaySpend.toString());

  const result = await agent.evaluate();
  console.log("Evaluate result:", result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
