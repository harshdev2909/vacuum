import { ethers } from "ethers";
import { config } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { metrics } from "../../utils/metrics.js";
import type { GasRecommendation } from "../../types.js";

const log = logger.child({ module: "gasManager" });

/**
 * Priority gas logic: base fee + priority from recent blocks and competition.
 * Adaptive multiplier from risk score and retry count.
 */
export async function getGasRecommendation(
  provider: ethers.Provider,
  riskScore: number,
  retryCount: number
): Promise<GasRecommendation> {
  const block = await provider.getBlock("latest");
  const baseFee = block?.baseFeePerGas ?? 0n;
  const nextBaseFee = (baseFee * 112n) / 100n; // assume ~12% next block
  const maxMultiplier = config.MAX_GAS_MULTIPLIER;
  let multiplier = 1 + (riskScore / 100) * 0.5;
  multiplier += retryCount * 0.15;
  multiplier = Math.min(multiplier, maxMultiplier);

  const maxFeePerGas = (nextBaseFee * BigInt(Math.floor(multiplier * 100)) / 100n) + 2n * 10n ** 9n;
  const maxPriorityFeePerGas = 2n * 10n ** 8n; // 0.2 gwei min on Arbitrum

  const gasLimit = 800000n; // default for swap; override per tx if needed

  return {
    maxFeePerGas: maxFeePerGas > 0n ? maxFeePerGas : 100n * 10n ** 9n,
    maxPriorityFeePerGas: maxPriorityFeePerGas,
    gasLimit,
  };
}

/**
 * Re-sign a raw tx with new gas (replace transaction).
 * Returns new raw signed tx; original signer must be available or we return null (server never has keys).
 * In production, client would re-submit with higher gas; here we only recommend.
 * This module can return "suggested" gas for the client to re-sign, or a relay that holds no keys
 * just replaces and re-broadcasts if the client sent a tx with replaceable params (EIP-1559).
 * For no-server-keys design: we return recommendation; worker tells client to "increase gas and resubmit" on failure.
 */
export function buildReplaceTxGasParams(
  currentMaxFeePerGas: bigint,
  currentPriorityFee: bigint,
  escalationMultiplier: number
): { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } {
  const maxFeePerGas = (currentMaxFeePerGas * BigInt(Math.floor(escalationMultiplier * 100))) / 100n;
  const maxPriorityFeePerGas = (currentPriorityFee * BigInt(Math.floor(escalationMultiplier * 100))) / 100n;
  return { maxFeePerGas, maxPriorityFeePerGas };
}

export function recordGasEscalation(): void {
  metrics.gasEscalation.inc();
  log.info("Gas escalation applied");
}
