import "dotenv/config";

export const config = {
  /** Primary RPC (Arbitrum). Used for broadcast and simulation. */
  RPC_URL: process.env.RPC_URL ?? "https://arb1.arbitrum.io/rpc",
  /** WebSocket RPC for mempool subscription (pending tx). */
  RPC_WS_URL: process.env.RPC_WS_URL ?? process.env.RPC_URL?.replace(/^https:/, "wss:") ?? "wss://arb1.arbitrum.io/ws",
  /** Optional: private relay / sequencer endpoint for submitting bundles or private tx. */
  PRIVATE_RELAY_URL: process.env.PRIVATE_RELAY_URL ?? "",
  /** Redis connection URL for queue and mempool window. */
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  /** API key required in X-API-Key header. Comma-separated for multiple. */
  API_KEYS: (process.env.API_KEYS ?? "dev-key").split(",").map((k) => k.trim()).filter(Boolean),
  /** Chain ID (42161 Arbitrum One, 421614 Arbitrum Sepolia). */
  CHAIN_ID: parseInt(process.env.CHAIN_ID ?? "42161", 10),
  /** Max gas price multiplier (e.g. 2 = 2x current base fee for maxFeePerGas). */
  MAX_GAS_MULTIPLIER: parseFloat(process.env.MAX_GAS_MULTIPLIER ?? "2"),
  /** Risk score above which we reject (0-100). */
  RISK_THRESHOLD: parseInt(process.env.RISK_THRESHOLD ?? "85", 10),
  /** Max slippage override in bps (e.g. 200 = 2%). 0 = use tx's own minOut. */
  MAX_SLIPPAGE_BPS: parseInt(process.env.MAX_SLIPPAGE_BPS ?? "300", 10),
  /** Mempool activity window in blocks. */
  MEMPOOL_WINDOW_BLOCKS: parseInt(process.env.MEMPOOL_WINDOW_BLOCKS ?? "3", 10),
  /** Queue name for pending txs. */
  QUEUE_NAME: process.env.QUEUE_NAME ?? "execution-engine:tx-queue",
  /** Port for RPC relay HTTP server. */
  PORT: parseInt(process.env.PORT ?? "8545", 10),
  /** Metrics port (same server mounts /metrics if METRICS_ENABLED=true). */
  METRICS_ENABLED: process.env.METRICS_ENABLED !== "false",
  /** Log level: debug, info, warn, error */
  LOG_LEVEL: (process.env.LOG_LEVEL ?? "info") as "debug" | "info" | "warn" | "error",
} as const;

export type Config = typeof config;
