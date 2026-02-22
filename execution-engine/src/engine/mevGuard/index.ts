import { ethers } from "ethers";
import { config } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { metrics } from "../../utils/metrics.js";
import type { MevGuardResult, MevAction, MempoolSnapshot } from "../../types.js";

const log = logger.child({ module: "mevGuard" });

/** Uniswap V3 SwapRouter (exactInputSingle selector). */
const EXACT_INPUT_SINGLE_SELECTOR = "0x414bf389";
/** Camelot / other router swap selectors (common). */
const SWAP_SELECTORS = new Set([
  EXACT_INPUT_SINGLE_SELECTOR,
  "0x5023b4df", // exactInput
  "0xdb3e2198", // exactOutputSingle
  "0x09b81346", // exactOutput
]);

function isSwapLike(data: string): boolean {
  if (!data || data.length < 10) return false;
  const selector = data.slice(0, 10).toLowerCase();
  return SWAP_SELECTORS.has(selector);
}

/**
 * Risk scoring model:
 * - Liquidity depth: large pending swaps in same pool increase risk
 * - Slippage tolerance: user minOut vs simulated output
 * - Tx size / gas: larger txs more visible
 * - Mempool competition: gas price vs pending
 */
export function evaluateMevRisk(
  rawTx: string,
  mempool: MempoolSnapshot,
  simulationOk: boolean,
  userMinOut?: bigint,
  simulatedOut?: bigint
): MevGuardResult {
  let riskScore = 0;
  const reasons: string[] = [];

  let tx: ethers.Transaction;
  try {
    tx = ethers.Transaction.from(rawTx as `0x${string}`);
  } catch {
    metrics.riskScore.observe(0);
    metrics.mevEvaluations.inc({ action: "safe" });
    return { riskScore: 0, action: "safe" };
  }
  const data = tx.data;
  const isSwap = isSwapLike(data);

  if (!simulationOk) {
    riskScore = 100;
    reasons.push("simulation_failed");
    metrics.riskScore.observe(riskScore);
    metrics.mevEvaluations.inc({ action: "reject" });
    return { riskScore, action: "reject", reason: reasons.join("; ") };
  }

  if (isSwap && mempool.pendingSwaps.length > 0) {
    // Same-pool / same-router pending txs increase risk
    const sameTarget = mempool.pendingSwaps.filter((s) => s.to?.toLowerCase() === tx.to?.toLowerCase());
    if (sameTarget.length >= 2) {
      riskScore += 35;
      reasons.push("same_pool_activity");
    }
    if (sameTarget.some((s) => (s.decoded?.amountIn ?? 0n) > ethers.parseEther("10"))) {
      riskScore += 25;
      reasons.push("whale_pending");
    }
  }

  // Slippage: if we have user minOut and simulated out, compare
  if (isSwap && userMinOut != null && simulatedOut != null && simulatedOut < userMinOut) {
    riskScore += 40;
    reasons.push("slippage_vulnerable");
  }

  // Gas competition: low gas vs high base fee
  const baseFee = mempool.baseFeePerGas;
  const txMaxFee = tx.maxFeePerGas ?? 0n;
  if (baseFee > 0n && txMaxFee < (baseFee * 120n) / 100n) {
    riskScore += 15;
    reasons.push("low_gas");
  }

  riskScore = Math.min(100, riskScore);
  metrics.riskScore.observe(riskScore);

  let action: MevAction = "safe";
  let suggestedGasMultiplier = 1;

  if (riskScore >= config.RISK_THRESHOLD) {
    action = "reject";
    metrics.mevEvaluations.inc({ action: "reject" });
  } else if (riskScore >= 60) {
    action = "bundle";
    metrics.mevEvaluations.inc({ action: "bundle" });
  } else if (riskScore >= 35) {
    action = "increaseGas";
    suggestedGasMultiplier = 1.2 + (riskScore - 35) / 100;
    metrics.mevEvaluations.inc({ action: "increaseGas" });
  } else {
    metrics.mevEvaluations.inc({ action: "safe" });
  }

  log.debug({ riskScore, action, reasons }, "MEV evaluation");
  return {
    riskScore,
    action,
    reason: reasons.length ? reasons.join("; ") : undefined,
    suggestedGasMultiplier: action === "increaseGas" ? suggestedGasMultiplier : undefined,
  };
}
