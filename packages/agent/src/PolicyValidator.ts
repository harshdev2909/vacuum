/**
 * Policy validator: evaluate PolicyEngine conditions before triggering rules.
 */

import { Contract } from "ethers";
import type { ArbiClient } from "vacuum-sdk";
import { toRuleId } from "vacuum-sdk";
import type { RiskGuardStatus } from "vacuum-sdk";

const POLICY_ENGINE_ABI = [
  "function evaluateCondition(bytes32 ruleId) view returns (bool)",
  "function getRule(bytes32 ruleId) view returns (bool exists, bool disabled, uint8 conditionType, bytes conditionParams, uint256 executionLimitPerPeriod, uint256 periodSeconds, uint256 executionsInCurrentPeriod, uint256 periodStartTimestamp, uint256 lastTriggerTimestamp)",
] as const;

export interface PolicyValidatorConfig {
  client: ArbiClient;
}

/**
 * Validates policy rules (condition evaluation) before trigger.
 */
export class PolicyValidator {
  private readonly client: ArbiClient;

  constructor(config: PolicyValidatorConfig) {
    this.client = config.client;
  }

  /**
   * Check if a rule exists, is not disabled, and its condition evaluates to true.
   */
  async validateRule(ruleId: string): Promise<{ valid: boolean; reason?: string }> {
    const rule = await this.client.dao.getRule(ruleId);
    if (!rule.exists) {
      return { valid: false, reason: "Rule does not exist" };
    }
    if (rule.disabled) {
      return { valid: false, reason: "Rule is disabled" };
    }
    const engine = new Contract(
      this.client.addresses.policyEngine,
      POLICY_ENGINE_ABI,
      this.client.provider
    );
    const id = ruleId.startsWith("0x") ? ruleId : toRuleId(ruleId);
    const result = await engine.evaluateCondition(id);
    if (!result) {
      return { valid: false, reason: "Condition not met" };
    }
    return { valid: true };
  }

  /**
   * Get current policy (RiskGuard) status for observability.
   */
  async getPolicyStatus(): Promise<RiskGuardStatus> {
    return this.client.dao.getPolicyStatus();
  }
}
