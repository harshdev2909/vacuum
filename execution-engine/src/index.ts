/**
 * Private RPC + MEV Protection Execution Engine for Arbitrum.
 * Run: npm run dev (or node dist/index.js)
 * - Starts RPC relay on PORT
 * - Optionally runs mempool listener and worker (default: all)
 */
import { config } from "./config/env.js";
import { createRpcServer } from "./server/rpc/index.js";
import { runMempoolListener } from "./engine/mempool/index.js";
import { runWorker } from "./engine/worker/index.js";
import { logger } from "./utils/logger.js";

const log = logger.child({ module: "main" });

async function main() {
  const runMempool = process.env.RUN_MEMPOOL !== "false";
  const runWorkerProcess = process.env.RUN_WORKER !== "false";

  const app = createRpcServer();
  app.listen(config.PORT, () => {
    log.info({ port: config.PORT }, "RPC relay listening");
  });

  if (runMempool) {
    runMempoolListener().catch((err) => {
      log.error({ err }, "Mempool listener error");
    });
  }

  if (runWorkerProcess) {
    runWorker().catch((err) => {
      log.error({ err }, "Worker error");
      process.exit(1);
    });
  }
}

main().catch((err) => {
  log.fatal({ err }, "Startup failed");
  process.exit(1);
});
