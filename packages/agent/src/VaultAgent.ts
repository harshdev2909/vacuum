/**
 * Vault agent: monitor APR/TVL and trigger harvest or reallocation.
 * Enforces risk caps; does not hold user keys.
 */

import type { AgentConfig, ExecutionSignal } from "./types";
import { BaseAgent } from "./BaseAgent";

export interface VaultAgentConfig extends AgentConfig {
  /** Vault address to monitor/harvest. */
  vaultAddress?: string;
}

/**
 * Agent that monitors vault state (APR, TVL) and produces harvest or rebalance signals.
 * submitExecution calls SDK vault harvest via controller if configured.
 */
export class VaultAgent extends BaseAgent {
  private readonly vaultAddress: string | undefined;

  constructor(config: VaultAgentConfig) {
    super(config);
    this.vaultAddress = config.vaultAddress;
  }

  /**
   * Generate signal: override with real logic (e.g. APR change, TVL threshold).
   * Example returns null; implement harvest trigger.
   */
  async generateSignal(): Promise<ExecutionSignal | null> {
    const vaultAddr = this.vaultAddress ?? this.client.addresses.vault;
    const info = await this.client.vaults.getVaultInfo(vaultAddr);
    if (info.paused || !info.strategyActive) {
      return null;
    }
    return null;
  }

  protected getSpendAmountFromSignal(_signal: ExecutionSignal): bigint {
    return 0n;
  }

  protected async submitExecution(signal: ExecutionSignal): Promise<boolean> {
    if (signal.type === "vault_harvest" && signal.payload && typeof signal.payload === "object" && "vaultAddress" in signal.payload) {
      const vaultAddr = (signal.payload as { vaultAddress: string }).vaultAddress;
      const controller = this.client.addresses.treasuryAutomationController;
      const { Contract } = await import("ethers");
      const abi = ["function executeVaultHarvest(address vault)"];
      const signer = this.client.signer;
      if (!signer) return false;
      const c = new Contract(controller, abi, signer);
      await c.executeVaultHarvest(vaultAddr);
      return true;
    }
    return false;
  }
}
