/**
 * Slippage helpers for swap minimum output and price impact.
 */

import type { BigNumberish } from "ethers";

/**
 * Compute minimum amount out given a slippage tolerance in basis points.
 * @param amountOut - Expected output amount
 * @param slippageBps - Slippage in basis points (e.g. 50 = 0.5%)
 * @returns Minimum amount out (bigint)
 */
export function applySlippageBps(amountOut: BigNumberish, slippageBps: number): bigint {
  const out = BigInt(amountOut.toString());
  if (slippageBps < 0 || slippageBps > 10000) {
    throw new RangeError("slippageBps must be between 0 and 10000");
  }
  return (out * BigInt(10000 - slippageBps)) / 10000n;
}

/**
 * Compute price impact in basis points: (expected - actual) / expected * 10000.
 */
export function priceImpactBps(expected: bigint, actual: bigint): number {
  if (expected === 0n) return 0;
  const diff = expected - actual;
  return Number((diff * 10000n) / expected);
}
