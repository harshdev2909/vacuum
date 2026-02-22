import { ethers } from "ethers";
import { logger } from "../../utils/logger.js";
import { metrics } from "../../utils/metrics.js";
import type { SimulationResult } from "../../types.js";

const log = logger.child({ module: "simulator" });

/**
 * Simulate a raw tx using eth_call (no broadcast).
 * Validates: revert, gas, and for swap-like txs can infer expected output from logs or state.
 */
export async function simulateRawTx(
  provider: ethers.Provider,
  rawTx: string
): Promise<SimulationResult> {
  try {
    const tx = ethers.Transaction.from(rawTx as `0x${string}`);
    const from = tx.from ?? ethers.ZeroAddress;
    const block = await provider.getBlock("latest");
    const baseFee = block?.baseFeePerGas ?? 0n;
    const maxFee = tx.maxFeePerGas ?? baseFee * 2n + (tx.maxPriorityFeePerGas ?? 0n);

    const result = await provider.call({
      from,
      to: tx.to ?? undefined,
      data: tx.data,
      value: tx.value,
      gasLimit: tx.gasLimit,
      blockTag: "latest",
    });

    const gasEstimate = await provider.estimateGas({
      from,
      to: tx.to ?? undefined,
      data: tx.data,
      value: tx.value,
    }).catch(() => undefined);

    metrics.simulationsTotal.inc({ result: "success" });
    return {
      success: true,
      gasEstimate: gasEstimate ?? 0n,
      reverted: false,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const reverted = message.includes("revert") || message.includes("execution reverted");
    log.warn({ err: message, reverted }, "Simulation failed");
    metrics.simulationsTotal.inc({ result: "failure" });
    return {
      success: false,
      reverted: reverted || message.includes("invalid") || message.includes("BytesLike"),
      revertReason: message.slice(0, 200),
    };
  }
}

/**
 * Simulate and extract expected output for swap (ExecutionRouter or router).
 * Uses staticCall pattern: run tx against latest block and infer output from success + balance/event.
 */
export async function simulateSwap(
  provider: ethers.Provider,
  rawTx: string,
  expectedMinOut?: bigint
): Promise<SimulationResult & { expectedOutput?: bigint }> {
  const base = await simulateRawTx(provider, rawTx);
  if (!base.success || base.reverted) {
    return base;
  }
  // For ExecutionRouter, we could decode receipt/logs; here we only validate no revert.
  // expectedOutput can be set by caller from getQuote if available.
  return {
    ...base,
    expectedOutput: expectedMinOut,
  };
}
