/**
 * Agent layer types: config, signals, execution payloads.
 */

import type { ArbiClient } from "vacuum-sdk";

export interface AgentConfig {
  /** SDK client (must have signer for submitExecution). */
  client: ArbiClient;
  /** Optional dry-run: evaluate and sign but do not submit. */
  dryRun?: boolean;
  /** Optional logger (structured). */
  logger?: AgentLogger;
}

export interface AgentLogger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

/** Signal produced by an agent (e.g. swap, harvest). */
export interface ExecutionSignal {
  type: "swap" | "vault_harvest" | "dao_trigger" | "custom";
  payload: unknown;
  /** Human-readable reason. */
  reason?: string;
}

/** Risk evaluation result before execution. */
export interface RiskEvaluation {
  allowed: boolean;
  reason?: string;
  /** RiskGuard canExecute result. */
  riskGuardOk?: boolean;
  /** Policy rule evaluation if applicable. */
  policyOk?: boolean;
}

/** EIP-712 typed data for delegated execution (structure depends on protocol). */
export interface TypedExecutionData {
  domain: { name: string; version: string; chainId: number; verifyingContract: string };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
}
