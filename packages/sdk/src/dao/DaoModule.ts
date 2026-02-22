/**
 * DAO module: RiskGuard, PolicyEngine, Treasury Controller, Buyback, Governance Adapter.
 */

import { Contract, type Provider, type Signer } from "ethers";
import { SignerError, ContractError } from "../errors";
import type { PolicyRule, TreasuryExposure, RiskGuardStatus, BuybackSchedule } from "../types";
import {
  RISK_GUARD_ABI,
  POLICY_ENGINE_ABI,
  TREASURY_AUTOMATION_CONTROLLER_ABI,
  BUYBACK_MODULE_ABI,
  GOVERNANCE_EXECUTOR_ADAPTER_ABI,
} from "../constants/abis";
import { toRuleId, encodePayload } from "../utils/encoding";

export interface DaoConfig {
  provider: Provider;
  signer?: Signer | null;
  riskGuard: string;
  policyEngine: string;
  treasuryController: string;
  buybackModule: string;
  governanceAdapter: string;
}

export class DaoModule {
  private readonly provider: Provider;
  private readonly signer: Signer | null;
  private readonly riskGuard: string;
  private readonly policyEngine: string;
  private readonly treasuryController: string;
  private readonly buybackModule: string;
  private readonly governanceAdapter: string;

  constructor(config: DaoConfig) {
    this.provider = config.provider;
    this.signer = config.signer ?? null;
    this.riskGuard = config.riskGuard;
    this.policyEngine = config.policyEngine;
    this.treasuryController = config.treasuryController;
    this.buybackModule = config.buybackModule;
    this.governanceAdapter = config.governanceAdapter;
  }

  /**
   * Get RiskGuard status (max daily spend, slippage, current spend, paused).
   */
  async getPolicyStatus(): Promise<RiskGuardStatus> {
    const rg = new Contract(this.riskGuard, RISK_GUARD_ABI, this.provider);
    const [maxDailySpend, maxSlippageBps, currentDaySpend, paused] = await Promise.all([
      rg.maxDailySpend(),
      rg.maxSlippageBps(),
      rg.getCurrentDaySpend(),
      rg.paused(),
    ]);
    return {
      maxDailySpend: BigInt(maxDailySpend.toString()),
      maxSlippageBps: BigInt(maxSlippageBps.toString()),
      currentDaySpend: BigInt(currentDaySpend.toString()),
      paused,
    };
  }

  /**
   * Check if an execution is allowed by RiskGuard.
   */
  async canExecute(strategyOrTarget: string, spendAmount: bigint): Promise<boolean> {
    const rg = new Contract(this.riskGuard, RISK_GUARD_ABI, this.provider);
    return rg.canExecute(strategyOrTarget, spendAmount);
  }

  /**
   * Create or update a policy rule (PolicyEngine owner).
   */
  async createRule(
    ruleId: string,
    conditionType: number,
    conditionParams: string | Uint8Array,
    executionLimitPerPeriod: bigint,
    periodSeconds: bigint
  ): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    const engine = new Contract(this.policyEngine, POLICY_ENGINE_ABI, this.signer);
    const id = ruleId.startsWith("0x") ? ruleId : toRuleId(ruleId);
    const params = encodePayload(conditionParams);
    try {
      const tx = await engine.setRule(
        id,
        conditionType,
        params,
        executionLimitPerPeriod,
        periodSeconds
      );
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Create rule failed");
    }
  }

  /**
   * Trigger a rule with execution payload.
   */
  async triggerRule(ruleId: string, executionPayload: string | Uint8Array): Promise<{ success: boolean; txHash: string }> {
    if (!this.signer) throw new SignerError();
    const engine = new Contract(this.policyEngine, POLICY_ENGINE_ABI, this.signer);
    const id = ruleId.startsWith("0x") ? ruleId : toRuleId(ruleId);
    const payload = encodePayload(executionPayload);
    try {
      const tx = await engine.triggerRule(id, payload);
      const receipt = await tx.wait();
      const success = receipt?.status === 1;
      return { success, txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Trigger rule failed");
    }
  }

  /**
   * Get rule by ID.
   */
  async getRule(ruleId: string): Promise<PolicyRule> {
    const engine = new Contract(this.policyEngine, POLICY_ENGINE_ABI, this.provider);
    const id = ruleId.startsWith("0x") ? ruleId : toRuleId(ruleId);
    const r = await engine.getRule(id);
    return {
      exists: r.exists,
      disabled: r.disabled,
      conditionType: Number(r.conditionType),
      conditionParams: r.conditionParams,
      executionLimitPerPeriod: BigInt(r.executionLimitPerPeriod.toString()),
      periodSeconds: BigInt(r.periodSeconds.toString()),
      executionsInCurrentPeriod: BigInt(r.executionsInCurrentPeriod.toString()),
      periodStartTimestamp: BigInt(r.periodStartTimestamp.toString()),
      lastTriggerTimestamp: BigInt(r.lastTriggerTimestamp.toString()),
    };
  }

  /**
   * Get all rule IDs.
   */
  async getRuleIds(): Promise<string[]> {
    const engine = new Contract(this.policyEngine, POLICY_ENGINE_ABI, this.provider);
    const ids = await engine.getRuleIds();
    return ids as string[];
  }

  /**
   * Get treasury exposure by token (from TreasuryAutomationController).
   */
  async getTreasuryExposure(tokens: string[]): Promise<TreasuryExposure[]> {
    const controller = new Contract(
      this.treasuryController,
      TREASURY_AUTOMATION_CONTROLLER_ABI,
      this.provider
    );
    const out: TreasuryExposure[] = [];
    for (const token of tokens) {
      const amount = await controller.exposureByToken(token);
      out.push({ token, amount: BigInt(amount.toString()) });
    }
    return out;
  }

  /**
   * Get treasury address from controller.
   */
  async getTreasuryAddress(): Promise<string> {
    const controller = new Contract(
      this.treasuryController,
      TREASURY_AUTOMATION_CONTROLLER_ABI,
      this.provider
    );
    return controller.treasury();
  }

  /**
   * Execute buyback: run next chunk of a schedule (owner or keeper). Not all contracts expose executeChunk; document.
   */
  async executeBuyback(_scheduleId: string): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    throw new ContractError("Execute buyback chunk via contract call to BuybackModule (method name may vary)");
  }

  /**
   * Get buyback schedules.
   */
  async getBuybackSchedules(): Promise<BuybackSchedule[]> {
    const mod = new Contract(this.buybackModule, BUYBACK_MODULE_ABI, this.provider);
    const ids = await mod.getScheduleIds();
    const out: BuybackSchedule[] = [];
    for (const scheduleId of ids as string[]) {
      const s = await mod.getSchedule(scheduleId);
      out.push({
        scheduleId,
        exists: s.exists,
        cancelled: s.cancelled,
        treasury: s.treasury,
        paymentToken: s.paymentToken,
        tokenToBuy: s.tokenToBuy,
        totalAmount: BigInt(s.totalAmount.toString()),
        chunks: BigInt(s.chunks.toString()),
        intervalSeconds: BigInt(s.intervalSeconds.toString()),
        chunksExecuted: BigInt(s.chunksExecuted.toString()),
        nextExecutionTime: BigInt(s.nextExecutionTime.toString()),
      });
    }
    return out;
  }

  /**
   * Get governance executor address.
   */
  async getExecutor(): Promise<string> {
    const adapter = new Contract(
      this.governanceAdapter,
      GOVERNANCE_EXECUTOR_ADAPTER_ABI,
      this.provider
    );
    return adapter.executor();
  }
}
