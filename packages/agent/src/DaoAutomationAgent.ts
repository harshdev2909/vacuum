/**
 * DAO automation agent: monitor governance/treasury and trigger buybacks or rules.
 * Respects daily limits and RiskGuard; validates policy before trigger.
 */

import type { AgentConfig, ExecutionSignal } from "./types";
import { BaseAgent } from "./BaseAgent";
import { PolicyValidator } from "./PolicyValidator";

export interface DaoAutomationAgentConfig extends AgentConfig {
  /** Rule ID to trigger (when signal type is dao_trigger). */
  ruleId?: string;
}

/**
 * Agent that monitors DAO state and triggers PolicyEngine rules or buyback execution.
 * Validates policy and RiskGuard before submission.
 */
export class DaoAutomationAgent extends BaseAgent {
  private readonly ruleId: string | undefined;
  private readonly policyValidator: PolicyValidator;

  constructor(config: DaoAutomationAgentConfig) {
    super(config);
    this.ruleId = config.ruleId;
    this.policyValidator = new PolicyValidator({ client: config.client });
  }

  /**
   * Generate signal: override with real logic (e.g. treasury threshold, governance event).
   * Example returns null; implement rule trigger or buyback decision.
   */
  async generateSignal(): Promise<ExecutionSignal | null> {
    const status = await this.policyValidator.getPolicyStatus();
    if (status.paused) return null;
    return null;
  }

  protected async evaluateRisk(signal: ExecutionSignal): Promise<import("./types").RiskEvaluation> {
    const base = await super.evaluateRisk(signal);
    if (!base.allowed) return base;
    if (signal.type === "dao_trigger" && this.ruleId) {
      const valid = await this.policyValidator.validateRule(this.ruleId);
      if (!valid.valid) {
        return { allowed: false, reason: valid.reason, policyOk: false };
      }
    }
    return { ...base, policyOk: true };
  }

  protected getSpendAmountFromSignal(signal: ExecutionSignal): bigint {
    if (signal.payload && typeof signal.payload === "object" && "spendAmount" in signal.payload) {
      return BigInt((signal.payload as { spendAmount: bigint }).spendAmount.toString());
    }
    return 0n;
  }

  protected async submitExecution(signal: ExecutionSignal): Promise<boolean> {
    if (signal.type === "dao_trigger" && signal.payload && typeof signal.payload === "object" && "ruleId" in signal.payload && "payload" in signal.payload) {
      const ruleId = (signal.payload as { ruleId: string }).ruleId;
      const payload = (signal.payload as { payload: string | Uint8Array }).payload;
      await this.client.dao.triggerRule(ruleId, payload);
      return true;
    }
    return false;
  }
}
