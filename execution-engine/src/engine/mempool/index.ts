import { ethers } from "ethers";
import { getRedis } from "../../utils/redis.js";
import { config } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import type { MempoolSnapshot, PendingSwap, PoolActivity } from "../../types.js";

const log = logger.child({ module: "mempool" });

const MEMPOOL_SNAPSHOT_KEY = "execution-engine:mempool:snapshot";
const SNAPSHOT_TTL_SEC = 30;

/** Decode Uniswap V3 exactInputSingle calldata (minimal: tokenIn, tokenOut, fee, amountIn). */
function decodeExactInputSingle(data: string): { tokenIn: string; tokenOut: string; fee: number; amountIn: bigint } | null {
  try {
    if (data.length < 10 + 32 * 7) return null;
    const selector = data.slice(0, 10);
    if (selector.toLowerCase() !== "0x414bf389") return null;
    const hex = data.slice(10);
    const tokenIn = "0x" + hex.slice(24, 64);
    const tokenOut = "0x" + hex.slice(88, 128);
    const fee = parseInt(hex.slice(128, 192), 16);
    const amountIn = BigInt("0x" + hex.slice(192, 256));
    return { tokenIn, tokenOut, fee, amountIn };
  } catch {
    return null;
  }
}

function poolKey(tokenIn: string, tokenOut: string, fee: number): string {
  const [a, b] = [tokenIn.toLowerCase(), tokenOut.toLowerCase()].sort();
  return `${a}-${b}-${fee}`;
}

/**
 * Listen to pending transactions via WebSocket, decode swaps, maintain snapshot in Redis.
 */
export async function runMempoolListener(): Promise<void> {
  const wsUrl = config.RPC_WS_URL;
  log.info({ wsUrl }, "Mempool listener starting");

  const pendingByHash = new Map<string, PendingSwap>();
  const poolActivity = new Map<string, PoolActivity>();
  const windowBlocks = config.MEMPOOL_WINDOW_BLOCKS;
  let lastBlockNumber = 0;

  const provider = new ethers.WebSocketProvider(wsUrl);

  provider.on("pending", async (hash: string) => {
    try {
      const tx = await provider.getTransaction(hash);
      if (!tx || !tx.to) return;
      const data = tx.data;
      if (!data || data.length < 10) return;

      const selector = data.slice(0, 10).toLowerCase();
      const isUniV3 = selector === "0x414bf389" || selector === "0x5023b4df";
      if (!isUniV3) return;

      const decoded = decodeExactInputSingle(data);
      const swap: PendingSwap = {
        hash,
        from: tx.from ?? "",
        to: tx.to,
        value: tx.value,
        data,
        gasPrice: tx.gasPrice ?? undefined,
        maxFeePerGas: tx.maxFeePerGas ?? undefined,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas ?? undefined,
        decoded: decoded ? { router: tx.to, ...decoded, amountIn: decoded.amountIn } : undefined,
      };
      pendingByHash.set(hash, swap);

      if (decoded) {
        const key = poolKey(decoded.tokenIn, decoded.tokenOut, decoded.fee);
        const cur = poolActivity.get(key) ?? {
          poolKey: key,
          tokenIn: decoded.tokenIn,
          tokenOut: decoded.tokenOut,
          fee: decoded.fee,
          totalAmountIn: 0n,
          totalAmountOut: 0n,
          txCount: 0,
          blockNumber: lastBlockNumber,
          lastUpdated: Date.now(),
        };
        cur.totalAmountIn += decoded.amountIn;
        cur.txCount += 1;
        cur.lastUpdated = Date.now();
        poolActivity.set(key, cur);
      }

      // Cap size
      if (pendingByHash.size > 500) {
        const entries = [...pendingByHash.entries()];
        entries.sort((a, b) => (a[1].decoded?.amountIn ?? 0n) > (b[1].decoded?.amountIn ?? 0n) ? -1 : 1);
        pendingByHash.clear();
        entries.slice(0, 300).forEach(([h, s]) => pendingByHash.set(h, s));
      }
    } catch (err) {
      log.debug({ err, hash }, "Pending tx fetch failed");
    }
  });

  const blockHandler = async () => {
    try {
      const block = await provider.getBlock("latest");
      if (!block) return;
      const newBlock = block.number;
      if (newBlock > lastBlockNumber) {
        lastBlockNumber = newBlock;
        // Prune old pool activity by block window
        for (const [k, v] of poolActivity.entries()) {
          if (newBlock - v.blockNumber > windowBlocks) poolActivity.delete(k);
        }
      }

      const baseFee = block.baseFeePerGas ?? 0n;
      const snapshot: MempoolSnapshot = {
        pendingSwaps: [...pendingByHash.values()],
        poolActivity: new Map(poolActivity),
        baseFeePerGas: baseFee,
        blockNumber: newBlock,
      };
      const redis = getRedis();
      await redis.set(
        MEMPOOL_SNAPSHOT_KEY,
        JSON.stringify({
          pendingSwaps: snapshot.pendingSwaps,
          poolActivity: [...snapshot.poolActivity.entries()],
          baseFeePerGas: baseFee.toString(),
          blockNumber: newBlock,
        }),
        "EX",
        SNAPSHOT_TTL_SEC
      );
    } catch (err) {
      log.warn({ err }, "Mempool snapshot failed");
    }
  };

  provider.on("block", blockHandler);
  setInterval(blockHandler, 5000);
}

/** Load current mempool snapshot from Redis (for worker). */
export async function getMempoolSnapshot(): Promise<MempoolSnapshot | null> {
  const redis = getRedis();
  const raw = await redis.get(MEMPOOL_SNAPSHOT_KEY);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    const poolActivity = new Map<string, PoolActivity>();
    for (const [k, v] of (o.poolActivity ?? []) as [string, PoolActivity][]) {
      poolActivity.set(k, v);
    }
    return {
      pendingSwaps: o.pendingSwaps ?? [],
      poolActivity,
      baseFeePerGas: BigInt(o.baseFeePerGas ?? "0"),
      blockNumber: o.blockNumber ?? 0,
    };
  } catch {
    return null;
  }
}
