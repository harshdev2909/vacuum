import { Redis } from "ioredis";
import { config } from "../config/env.js";
import { logger } from "./logger.js";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 500, 5000);
        logger.warn({ times, delay }, "Redis reconnect");
        return delay;
      },
    });
    client.on("error", (err: Error) => logger.error({ err }, "Redis error"));
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

/** Push to queue (right). */
export async function enqueueTx(payload: string): Promise<void> {
  const redis = getRedis();
  await redis.rpush(config.QUEUE_NAME, payload);
}

/** Pop from queue (left). Blocks with BLPOP if needed. */
export async function dequeueTx(timeoutSeconds = 5): Promise<string | null> {
  const redis = getRedis();
  const result = await redis.blpop(config.QUEUE_NAME, timeoutSeconds);
  return result?.[1] ?? null;
}

/** Get queue length. */
export async function getQueueLength(): Promise<number> {
  const redis = getRedis();
  return redis.llen(config.QUEUE_NAME);
}
