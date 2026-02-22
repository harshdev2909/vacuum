import type { Provider } from "ethers";
import { logger } from "../../utils/logger.js";
import type { BroadcastResult } from "../../types.js";

const log = logger.child({ module: "bundler" });

/**
 * Bundle multiple raw txs and submit as ordered.
 * Supports: (1) sequential broadcast (one after another, wait for inclusion or timeout)
 * or (2) private relay batch endpoint if PRIVATE_RELAY_URL supports it.
 * Here we do sequential broadcast to preserve order; no private batch API assumed.
 */
export async function broadcastBundle(
  provider: Provider,
  rawTxs: string[],
  options?: { timeoutMs?: number }
): Promise<BroadcastResult[]> {
  const results: BroadcastResult[] = [];
  const timeoutMs = options?.timeoutMs ?? 60_000;

  for (let i = 0; i < rawTxs.length; i++) {
    const raw = rawTxs[i];
    const resp = await new Promise<{ hash: string } | null>((resolve) => {
      provider.broadcastTransaction(raw as `0x${string}`)
        .then((tx: { hash: string }) => resolve({ hash: tx.hash }))
        .catch((err: unknown) => {
          log.warn({ err, index: i }, "Bundle item broadcast failed");
          resolve(null);
        });
    });
    const txHash = resp?.hash ?? null;
    if (txHash) {
      results.push({ success: true, txHash });
      // Wait for inclusion or timeout before next
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const receipt = await provider.getTransactionReceipt(txHash as `0x${string}`);
        if (receipt && receipt.blockNumber) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
    } else {
      results.push({ success: false, error: "Broadcast failed" });
      break;
    }
  }
  return results;
}

/**
 * Single tx broadcast (used when not bundling).
 */
export async function broadcastSingle(
  provider: Provider,
  rawTx: string
): Promise<BroadcastResult> {
  try {
    const tx = await provider.broadcastTransaction(rawTx as `0x${string}`) as { hash: string };
    return { success: true, txHash: tx.hash };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
