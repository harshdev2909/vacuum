import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from "prom-client";
import { config } from "../config/env.js";

export const register = new Registry();

if (config.METRICS_ENABLED) {
  collectDefaultMetrics({ register, prefix: "execution_engine_" });
}

export const metrics = {
  txsReceived: new Counter({
    name: "execution_engine_txs_received_total",
    help: "Total transactions received by RPC relay",
    labelNames: ["method"],
    registers: [register],
  }),
  txsEnqueued: new Counter({
    name: "execution_engine_txs_enqueued_total",
    help: "Total transactions enqueued",
    registers: [register],
  }),
  txsRejected: new Counter({
    name: "execution_engine_txs_rejected_total",
    help: "Total transactions rejected (auth, nonce, validation)",
    labelNames: ["reason"],
    registers: [register],
  }),
  txsBroadcast: new Counter({
    name: "execution_engine_txs_broadcast_total",
    help: "Total broadcast attempts",
    labelNames: ["result", "fallback"],
    registers: [register],
  }),
  simulationsTotal: new Counter({
    name: "execution_engine_simulations_total",
    help: "Total simulations",
    labelNames: ["result"],
    registers: [register],
  }),
  mevEvaluations: new Counter({
    name: "execution_engine_mev_evaluations_total",
    help: "MEV guard evaluations",
    labelNames: ["action"],
    registers: [register],
  }),
  riskScore: new Histogram({
    name: "execution_engine_risk_score",
    help: "MEV risk score distribution",
    buckets: [0, 25, 50, 75, 85, 95, 100],
    registers: [register],
  }),
  gasEscalation: new Counter({
    name: "execution_engine_gas_escalation_total",
    help: "Gas escalation / retry count",
    registers: [register],
  }),
  queueLength: new Gauge({
    name: "execution_engine_queue_length",
    help: "Current tx queue length",
    registers: [register],
  }),
};
