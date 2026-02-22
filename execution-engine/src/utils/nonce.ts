import { ethers } from "ethers";
import { getRedis } from "./redis.js";
import { logger } from "./logger.js";

const NONCE_PREFIX = "execution-engine:nonce:";

/**
 * Validate and reserve nonce for address to prevent replay and out-of-order.
 * Returns true if nonce is accepted and stored (expected next nonce).
 */
export async function validateAndReserveNonce(address: string, nonce: number): Promise<boolean> {
  const key = `${NONCE_PREFIX}${address.toLowerCase()}`;
  const redis = getRedis();
  const current = await redis.get(key);
  const expected = current === null ? 0 : parseInt(current, 10);
  if (nonce !== expected) {
    logger.debug({ address, nonce, expected }, "Nonce validation failed");
    return false;
  }
  await redis.set(key, String(nonce + 1), "EX", 3600 * 24); // 24h TTL
  return true;
}

/**
 * Get next expected nonce for address (for info only; chain is source of truth).
 */
export async function getStoredNonce(address: string): Promise<number | null> {
  const key = `${NONCE_PREFIX}${address.toLowerCase()}`;
  const redis = getRedis();
  const v = await redis.get(key);
  return v === null ? null : parseInt(v, 10);
}

/**
 * Recover sender from raw signed tx.
 */
export function recoverSenderFromRawTx(rawTx: string): string | null {
  try {
    const tx = ethers.Transaction.from(rawTx as `0x${string}`);
    return tx.from ?? null;
  } catch {
    return null;
  }
}
