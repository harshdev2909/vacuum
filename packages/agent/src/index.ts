/**
 * @vacuum/agent — Non-custodial agent framework for Vacuum protocol.
 *
 * Agents generate signals, sign execution (EIP-712), and submit via SDK.
 * They do not hold user private keys; they use the SDK client's signer.
 */

export { BaseAgent } from "./BaseAgent";
export { StrategyAgent } from "./StrategyAgent";
export type { StrategyAgentConfig } from "./StrategyAgent";
export { VaultAgent } from "./VaultAgent";
export type { VaultAgentConfig } from "./VaultAgent";
export { DaoAutomationAgent } from "./DaoAutomationAgent";
export type { DaoAutomationAgentConfig } from "./DaoAutomationAgent";
export { RiskEvaluator } from "./RiskEvaluator";
export type { RiskEvaluatorConfig } from "./RiskEvaluator";
export { PolicyValidator } from "./PolicyValidator";
export type { PolicyValidatorConfig } from "./PolicyValidator";
export { ExecutionSigner } from "./ExecutionSigner";
export type { ExecutionSignerConfig } from "./ExecutionSigner";
export type { AgentConfig, AgentLogger, ExecutionSignal, RiskEvaluation, TypedExecutionData } from "./types";
