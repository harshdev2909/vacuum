/**
 * Risk evaluation module: check RiskGuard and PolicyEngine before submitting execution.
 */

import type { ArbiClient } from "vacuum-sdk";
import type { RiskEvaluation } from "./types";

export interface RiskEvaluatorConfig {
  client: ArbiClient;
  /** Optional RiskGuard target address for canExecute (e.g. strategy or controller). */
  riskGuardTarget?: string;
}

/**
 * Evaluates whether an execution is allowed by RiskGuard and optionally policy.
 */
export class RiskEvaluator {
  private readonly client: ArbiClient;
  private readonly riskGuardTarget: string | undefined;

  constructor(config: RiskEvaluatorConfig) {
    this.client = config.client;
    this.riskGuardTarget = config.riskGuardTarget;
  }

  /**
   * Run full risk check: policy status (paused, daily spend) and canExecute.
   */
  async evaluate(spendAmountWei: bigint): Promise<RiskEvaluation> {
    const status = await this.client.dao.getPolicyStatus();
    if (status.paused) {
      return { allowed: false, reason: "RiskGuard is paused", riskGuardOk: false };
    }
    const target = this.riskGuardTarget ?? this.client.addresses.treasuryAutomationController;
    const riskGuardOk = await this.client.dao.canExecute(target, spendAmountWei);
    if (!riskGuardOk) {
      return {
        allowed: false,
        reason: "RiskGuard canExecute false (daily limit or slippage)",
        riskGuardOk: false,
      };
    }
    return { allowed: true, riskGuardOk: true, policyOk: true };
  }
}
