/**
 * Example: Simple momentum-style strategy agent.
 * Extends StrategyAgent; generates a swap signal when conditions are met (placeholder logic).
 *
 * Run: PRIVATE_KEY=0x... npx ts-node examples/SimpleMomentumAgent.ts
 */

import { ArbiClient } from "vacuum-sdk";
import { StrategyAgent } from "../src";
import { JsonRpcProvider, Wallet } from "ethers";

const RPC = process.env.RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
const CHAIN_ID = Number(process.env.CHAIN_ID ?? "421614");

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

  const agent = new StrategyAgent({
    client,
    dryRun: process.env.DRY_RUN === "true",
    maxSlippageBps: 50,
  });

  agent.start();
  const result = await agent.evaluate();
  agent.stop();

  console.log("Evaluate result:", result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
