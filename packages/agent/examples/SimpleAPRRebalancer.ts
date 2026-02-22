/**
 * Example: Simple APR rebalancer (vault) agent.
 * Extends VaultAgent; in production override generateSignal() with real APR/TVL logic.
 *
 * Run: PRIVATE_KEY=0x... npx ts-node examples/SimpleAPRRebalancer.ts
 */

import { ArbiClient } from "vacuum-sdk";
import { VaultAgent } from "../src";
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

  const agent = new VaultAgent({
    client,
    dryRun: process.env.DRY_RUN === "true",
  });

  const result = await agent.evaluate();
  console.log("Evaluate result:", result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
