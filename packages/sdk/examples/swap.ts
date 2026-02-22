/**
 * Example: Swap ETH → USDC using the Vacuum SDK (Arbitrum Sepolia).
 *
 * Usage:
 *   PRIVATE_KEY=0x... npx ts-node examples/swap.ts
 *
 * Ensure you have ETH on Arbitrum Sepolia and the ExecutionRouter is deployed.
 */

import { ArbiClient } from "../src";
import { JsonRpcProvider, Wallet } from "ethers";

const RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const CHAIN_ID = 421614;
const WETH = "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73";
const USDC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4D";
const FEE = 500;
const SLIPPAGE_BPS = 50;
const AMOUNT_ETH = "0.001";

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

  const amountIn = BigInt(Math.floor(parseFloat(AMOUNT_ETH) * 1e18));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

  const quote = await client.execution.getQuote({
    exactInputSingle: {
      tokenIn: WETH,
      tokenOut: USDC,
      fee: FEE,
      recipient: wallet.address,
      amountIn,
      amountOutMinimum: 0n,
    },
    beneficiary: wallet.address,
  });

  console.log("Quote amountOut:", quote.amountOut.toString());

  const result = await client.execution.swapExactInputSingleWithSlippage({
    exactInputSingle: {
      tokenIn: WETH,
      tokenOut: USDC,
      fee: FEE,
      recipient: wallet.address,
      amountIn,
      amountOutMinimum: 0n,
    },
    deadline,
    beneficiary: wallet.address,
    slippageBps: SLIPPAGE_BPS,
  });

  console.log("Swap txHash:", result.txHash);
  console.log("Amount out:", result.amountOut.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
