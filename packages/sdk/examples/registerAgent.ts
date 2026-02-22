/**
 * Example: Register an agent and optionally stake (Arbitrum Sepolia).
 *
 * Usage:
 *   PRIVATE_KEY=0x... npx ts-node examples/registerAgent.ts
 *
 * Agent IDs are bytes32; use a string (e.g. "my-agent-1") and the SDK hashes it.
 */

import { ArbiClient } from "../src";
import { JsonRpcProvider, Wallet } from "ethers";

const RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const CHAIN_ID = 421614;
const AGENT_ID = "my-agent-1";
const METADATA_URI = "ipfs://QmExampleMetadata";

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

  const { txHash } = await client.agents.registerAgent(AGENT_ID, METADATA_URI);
  console.log("Register agent txHash:", txHash);

  const meta = await client.agents.getAgentMetadata(AGENT_ID);
  console.log("Creator:", meta.creator);
  console.log("Active:", meta.active);
  console.log("Metadata URI:", meta.metadataURI);

  const active = await client.agents.isAgentActive(AGENT_ID);
  console.log("Is active:", active);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
