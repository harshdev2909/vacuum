import { ethers } from "ethers";
import { config } from "../../config/env.js";
import { dequeueTx } from "../../utils/redis.js";
import { logger } from "../../utils/logger.js";
import { metrics } from "../../utils/metrics.js";
import { simulateSwap } from "../simulator/index.js";
import { evaluateMevRisk } from "../mevGuard/index.js";
import { getMempoolSnapshot } from "../mempool/index.js";
import { getGasRecommendation, recordGasEscalation } from "../gasManager/index.js";
import { broadcastSingle } from "../bundler/index.js";
import type { QueuedTx } from "../../types.js";

const log = logger.child({ module: "worker" });

const FALLBACK_GAS_MULTIPLIER = 1.25;

export async function runWorker(): Promise<void> {
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  let retryCount = 0;

  log.info("Worker started");

  while (true) {
    const raw = await dequeueTx(10);
    if (!raw) continue;

    let queued: QueuedTx;
    try {
      queued = JSON.parse(raw) as QueuedTx;
    } catch {
      log.warn("Invalid queue payload");
      continue;
    }

    const { rawTx, id, from } = queued;
    const runLog = log.child({ id, from });

    try {
      const mempool = await getMempoolSnapshot();
      const snapshot = mempool ?? {
        pendingSwaps: [],
        poolActivity: new Map(),
        baseFeePerGas: 0n,
        blockNumber: 0,
      };

      const sim = await simulateSwap(provider, rawTx);
      if (!sim.success || sim.reverted) {
        runLog.warn({ revertReason: sim.revertReason }, "Simulation failed; rejecting");
        metrics.txsBroadcast.inc({ result: "reject", fallback: "false" });
        continue;
      }

      const mev = evaluateMevRisk(rawTx, snapshot, true, undefined, sim.expectedOutput);
      if (mev.action === "reject") {
        runLog.warn({ riskScore: mev.riskScore, reason: mev.reason }, "MEV guard rejected");
        metrics.txsBroadcast.inc({ result: "reject", fallback: "false" });
        continue;
      }

      let txToSend = rawTx;
      if (mev.action === "increaseGas" && mev.suggestedGasMultiplier) {
        recordGasEscalation();
        const gasRec = await getGasRecommendation(provider, mev.riskScore, retryCount);
        runLog.info({ suggestedGasMultiplier: mev.suggestedGasMultiplier }, "Gas increase suggested");
        txToSend = rawTx;
      }

      let result = await broadcastSingle(provider, txToSend);
      if (!result.success && config.PRIVATE_RELAY_URL) {
        try {
          const relayProvider = new ethers.JsonRpcProvider(config.PRIVATE_RELAY_URL);
          result = await broadcastSingle(relayProvider, txToSend);
          if (result.success) result.usedFallback = false;
        } catch {
          result = { success: false, error: "Private relay failed" };
        }
      }

      if (!result.success) {
        runLog.warn({ error: result.error }, "Broadcast failed; retrying on primary RPC (fallback)");
        retryCount += 1;
        result = await broadcastSingle(provider, txToSend);
        result.usedFallback = true;
      } else {
        retryCount = 0;
      }

      if (result.success) {
        metrics.txsBroadcast.inc({ result: "success", fallback: String(result.usedFallback ?? false) });
        runLog.info({ txHash: result.txHash }, "Tx broadcast success");
      } else {
        metrics.txsBroadcast.inc({ result: "failure", fallback: "false" });
        runLog.error({ error: result.error }, "Tx broadcast failed");
      }
    } catch (err) {
      runLog.error({ err }, "Worker processing error");
      metrics.txsBroadcast.inc({ result: "error", fallback: "false" });
    }
  }
}

