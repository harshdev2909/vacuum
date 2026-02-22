/**
 * Example: Read DAO state — RiskGuard status and buyback schedules (Arbitrum Sepolia).
 *
 * Usage:
 *   npx ts-node examples/daoBuyback.ts
 *
 * No signer required for read-only calls.
 */

import { ArbiClient } from "../src";
import { JsonRpcProvider } from "ethers";

const RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const CHAIN_ID = 421614;

async function main() {
  const provider = new JsonRpcProvider(RPC);
  const client = new ArbiClient({
    rpcUrl: RPC,
    chainId: CHAIN_ID,
  });

  const status = await client.dao.getPolicyStatus();
  console.log("RiskGuard — maxDailySpend:", status.maxDailySpend.toString());
  console.log("RiskGuard — maxSlippageBps:", status.maxSlippageBps.toString());
  console.log("RiskGuard — currentDaySpend:", status.currentDaySpend.toString());
  console.log("RiskGuard — paused:", status.paused);

  const treasury = await client.dao.getTreasuryAddress();
  console.log("Treasury:", treasury);

  const schedules = await client.dao.getBuybackSchedules();
  console.log("Buyback schedules count:", schedules.length);
  for (const s of schedules) {
    if (!s.exists || s.cancelled) continue;
    console.log("  Schedule:", s.scheduleId);
    console.log("  Token to buy:", s.tokenToBuy);
    console.log("  Chunks executed:", s.chunksExecuted.toString());
    console.log("  Next execution time:", s.nextExecutionTime.toString());
  }

  const ruleIds = await client.dao.getRuleIds();
  console.log("Policy rule IDs:", ruleIds.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
