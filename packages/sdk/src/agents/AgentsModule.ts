/**
 * Agent module: AgentRegistry, AgentStaking, AgentRevenueDistributor, AgentSubscriptionManager.
 */

import { Contract, type Provider, type Signer } from "ethers";
import { SignerError, ContractError } from "../errors";
import type { AgentInfo, AgentPerformance } from "../types";
import {
  AGENT_REGISTRY_ABI,
  AGENT_STAKING_ABI,
  AGENT_REVENUE_DISTRIBUTOR_ABI,
  AGENT_SUBSCRIPTION_MANAGER_ABI,
} from "../constants/abis";
import { toAgentId } from "../utils/encoding";

export interface AgentsConfig {
  provider: Provider;
  signer?: Signer | null;
  agentRegistry: string;
  agentRevenueDistributor: string;
  agentSubscriptionManager: string;
  agentStaking?: string;
}

export class AgentsModule {
  private readonly provider: Provider;
  private readonly signer: Signer | null;
  private readonly agentRegistry: string;
  private readonly agentRevenueDistributor: string;
  private readonly agentSubscriptionManager: string;
  private readonly agentStaking: string | null;

  constructor(config: AgentsConfig) {
    this.provider = config.provider;
    this.signer = config.signer ?? null;
    this.agentRegistry = config.agentRegistry;
    this.agentRevenueDistributor = config.agentRevenueDistributor;
    this.agentSubscriptionManager = config.agentSubscriptionManager;
    this.agentStaking = config.agentStaking ?? null;
  }

  /**
   * Register an agent (creator). agentId can be string or bytes32 hex.
   */
  async registerAgent(agentId: string, metadataURI: string): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    const registry = new Contract(this.agentRegistry, AGENT_REGISTRY_ABI, this.signer);
    const id = agentId.startsWith("0x") ? agentId : toAgentId(agentId);
    try {
      const tx = await registry.registerAgent(id, metadataURI);
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Register agent failed");
    }
  }

  /**
   * Update agent metadata and active flag (creator only).
   */
  async updateAgent(agentId: string, metadataURI: string, active: boolean): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    const registry = new Contract(this.agentRegistry, AGENT_REGISTRY_ABI, this.signer);
    const id = agentId.startsWith("0x") ? agentId : toAgentId(agentId);
    try {
      const tx = await registry.updateAgent(id, metadataURI, active);
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Update agent failed");
    }
  }

  /**
   * Deactivate agent (creator only).
   */
  async deactivateAgent(agentId: string): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    const registry = new Contract(this.agentRegistry, AGENT_REGISTRY_ABI, this.signer);
    const id = agentId.startsWith("0x") ? agentId : toAgentId(agentId);
    try {
      const tx = await registry.deactivateAgent(id);
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Deactivate agent failed");
    }
  }

  /**
   * Get agent metadata (creator, metadataURI, active).
   */
  async getAgentMetadata(agentId: string): Promise<AgentInfo> {
    const registry = new Contract(this.agentRegistry, AGENT_REGISTRY_ABI, this.provider);
    const id = agentId.startsWith("0x") ? agentId : toAgentId(agentId);
    const [creator, metadataURI, active] = await registry.getAgent(id);
    return {
      agentId: id,
      creator,
      metadataURI,
      active,
    };
  }

  /**
   * Check if agent is active.
   */
  async isAgentActive(agentId: string): Promise<boolean> {
    const registry = new Contract(this.agentRegistry, AGENT_REGISTRY_ABI, this.provider);
    const id = agentId.startsWith("0x") ? agentId : toAgentId(agentId);
    return registry.isActive(id);
  }

  /**
   * Stake on an agent (requires staking token approval). Only if AgentStaking is configured.
   */
  async stakeAgent(agentId: string, amount: bigint): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    if (!this.agentStaking) throw new ContractError("AgentStaking not configured");
    const staking = new Contract(this.agentStaking, AGENT_STAKING_ABI, this.signer);
    const id = agentId.startsWith("0x") ? agentId : toAgentId(agentId);
    try {
      const tx = await staking.stake(id, amount);
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Stake failed");
    }
  }

  /**
   * Unstake from an agent.
   */
  async unstakeAgent(agentId: string, amount: bigint): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    if (!this.agentStaking) throw new ContractError("AgentStaking not configured");
    const staking = new Contract(this.agentStaking, AGENT_STAKING_ABI, this.signer);
    const id = agentId.startsWith("0x") ? agentId : toAgentId(agentId);
    try {
      const tx = await staking.unstake(id, amount);
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Unstake failed");
    }
  }

  /**
   * Get agent staking performance (total stake, user stake, meets minimum).
   */
  async getAgentPerformance(agentId: string, userAddress: string): Promise<AgentPerformance | null> {
    if (!this.agentStaking) return null;
    const staking = new Contract(this.agentStaking, AGENT_STAKING_ABI, this.provider);
    const id = agentId.startsWith("0x") ? agentId : toAgentId(agentId);
    const [totalStake, userStake, meetsMinimum] = await Promise.all([
      staking.totalStake(id),
      staking.stakeOf(id, userAddress),
      staking.meetsMinimumStake(id),
    ]);
    return {
      agentId: id,
      totalStake: BigInt(totalStake.toString()),
      userStake: BigInt(userStake.toString()),
      meetsMinimumStake: meetsMinimum,
    };
  }

  /**
   * Subscribe to an agent (payment for subscription).
   */
  async subscribeToAgent(
    agentId: string,
    durationSeconds: bigint,
    paymentToken: string,
    amount: bigint
  ): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    const sub = new Contract(
      this.agentSubscriptionManager,
      AGENT_SUBSCRIPTION_MANAGER_ABI,
      this.signer
    );
    const id = agentId.startsWith("0x") ? agentId : toAgentId(agentId);
    try {
      const tx = await sub.subscribe(id, durationSeconds, paymentToken, amount);
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Subscribe to agent failed");
    }
  }

  /**
   * Get subscription status for user and agent.
   */
  async getAgentSubscriptionStatus(user: string, agentId: string): Promise<{ active: boolean; expiry: bigint }> {
    const sub = new Contract(
      this.agentSubscriptionManager,
      AGENT_SUBSCRIPTION_MANAGER_ABI,
      this.provider
    );
    const id = agentId.startsWith("0x") ? agentId : toAgentId(agentId);
    const [active, expiry] = await Promise.all([
      sub.isSubscriptionActive(user, id),
      sub.subscriptionExpiry(user, id),
    ]);
    return { active, expiry: BigInt(expiry.toString()) };
  }

  /**
   * Claim agent revenue (creator). Token = payment token to claim.
   */
  async claimAgentRevenue(token: string): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    const dist = new Contract(
      this.agentRevenueDistributor,
      AGENT_REVENUE_DISTRIBUTOR_ABI,
      this.signer
    );
    try {
      const tx = await dist.claim(token);
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Claim agent revenue failed");
    }
  }

  /**
   * Get claimable revenue for account and token.
   */
  async getClaimableAgentRevenue(account: string, token: string): Promise<bigint> {
    const dist = new Contract(
      this.agentRevenueDistributor,
      AGENT_REVENUE_DISTRIBUTOR_ABI,
      this.provider
    );
    const amount = await dist.claimable(account, token);
    return BigInt(amount.toString());
  }
}
