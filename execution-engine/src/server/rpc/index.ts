import express, { Request, Response } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { ethers } from "ethers";
import { config } from "../../config/env.js";
import { enqueueTx, getQueueLength } from "../../utils/redis.js";
import { validateAndReserveNonce, recoverSenderFromRawTx } from "../../utils/nonce.js";
import { logger } from "../../utils/logger.js";
import { metrics, register } from "../../utils/metrics.js";
import type { QueuedTx, EIP712ExecutionPayload } from "../../types.js";

const log = logger.child({ module: "rpc" });

const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

function authMiddleware(req: Request, res: Response, next: () => void) {
  const key = req.headers["x-api-key"] as string | undefined;
  if (!key || !config.API_KEYS.includes(key)) {
    metrics.txsRejected.inc({ reason: "auth" });
    res.status(401).json({ error: "Invalid or missing X-API-Key" });
    return;
  }
  (req as Request & { apiKeyId: string }).apiKeyId = key.slice(0, 8);
  next();
}

async function rateLimitMiddleware(req: Request, res: Response, next: () => void) {
  const keyId = (req as Request & { apiKeyId?: string }).apiKeyId ?? "anon";
  try {
    await rateLimiter.consume(keyId);
    next();
  } catch {
    metrics.txsRejected.inc({ reason: "rate_limit" });
    res.status(429).json({ error: "Rate limit exceeded" });
  }
}

export function createRpcServer() {
  const app = express();
  app.use(express.json({ limit: "256kb" }));

  app.post("/rpc", authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
    const body = req.body as { method?: string; params?: unknown[] };
    const method = body?.method;
    const params = Array.isArray(body?.params) ? body.params : [];

    if (method === "eth_sendRawTransaction") {
      const rawTx = params[0] as string | undefined;
      if (!rawTx || typeof rawTx !== "string" || !rawTx.startsWith("0x")) {
        metrics.txsRejected.inc({ reason: "invalid_params" });
        res.status(400).json({ error: "Invalid params: expected [rawTxHex]" });
        return;
      }
      metrics.txsReceived.inc({ method: "eth_sendRawTransaction" });

      const from = recoverSenderFromRawTx(rawTx);
      if (!from) {
        metrics.txsRejected.inc({ reason: "invalid_tx" });
        res.status(400).json({ error: "Invalid raw transaction" });
        return;
      }
      const tx = ethers.Transaction.from(rawTx as `0x${string}`);
      const nonce = Number(tx.nonce ?? 0);
      const nonceOk = await validateAndReserveNonce(from, nonce);
      if (!nonceOk) {
        metrics.txsRejected.inc({ reason: "nonce" });
        res.status(400).json({ error: "Invalid or duplicate nonce" });
        return;
      }

      const queued: QueuedTx = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        rawTx,
        enqueuedAt: new Date().toISOString(),
        apiKeyId: (req as Request & { apiKeyId: string }).apiKeyId,
        nonce,
        from,
      };
      await enqueueTx(JSON.stringify(queued));
      metrics.txsEnqueued.inc();
      log.info({ id: queued.id, from }, "Tx enqueued");
      res.status(200).json({ jsonrpc: "2.0", id: req.body?.id ?? null, result: "0xqueued" });
      return;
    }

    if (method === "vacuum_execute") {
      const payload = params[0] as EIP712ExecutionPayload["params"] | undefined;
      const rawTx = payload?.rawTransaction;
      if (!rawTx || typeof rawTx !== "string") {
        metrics.txsRejected.inc({ reason: "invalid_params" });
        res.status(400).json({ error: "vacuum_execute requires params[0].rawTransaction" });
        return;
      }
      metrics.txsReceived.inc({ method: "vacuum_execute" });
      const from = recoverSenderFromRawTx(rawTx);
      if (!from) {
        metrics.txsRejected.inc({ reason: "invalid_tx" });
        res.status(400).json({ error: "Invalid raw transaction" });
        return;
      }
      const tx = ethers.Transaction.from(rawTx as `0x${string}`);
      const nonce = Number(tx.nonce ?? 0);
      const nonceOk = await validateAndReserveNonce(from, nonce);
      if (!nonceOk) {
        metrics.txsRejected.inc({ reason: "nonce" });
        res.status(400).json({ error: "Invalid or duplicate nonce" });
        return;
      }
      const queued: QueuedTx = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        rawTx,
        enqueuedAt: new Date().toISOString(),
        apiKeyId: (req as Request & { apiKeyId: string }).apiKeyId,
        nonce,
        from,
      };
      await enqueueTx(JSON.stringify(queued));
      metrics.txsEnqueued.inc();
      log.info({ id: queued.id, from }, "Tx enqueued (vacuum_execute)");
      res.status(200).json({ jsonrpc: "2.0", id: req.body?.id ?? null, result: "0xqueued" });
      return;
    }

    res.status(400).json({ error: `Unsupported method: ${method}` });
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", ts: new Date().toISOString() });
  });

  if (config.METRICS_ENABLED) {
    app.get("/metrics", async (_req, res) => {
      try {
        const queueLength = await getQueueLength();
        metrics.queueLength.set(queueLength);
        res.set("Content-Type", register.contentType);
        res.end(await register.metrics());
      } catch (e: unknown) {
        res.status(500).end(String(e));
      }
    });
  }

  return app;
}
