/**
 * Strategy agent: monitor conditions and trigger execution strategy.
 * Checks subscription validity and enforces slippage; does not hold keys.
 */

import type { AgentConfig, ExecutionSignal } from "./types";
import { BaseAgent } from "./BaseAgent";

export interface StrategyAgentConfig extends AgentConfig {
  /** Strategy token ID to monitor. */
  strategyTokenId?: bigint;
  /** Max slippage bps for any swap signal. */
  maxSlippageBps?: number;
}

/**
 * Agent that evaluates strategy conditions (e.g. price, volatility) and produces swap or rebalance signals.
 * Subscription validity is checked via SDK; execution is submitted only if RiskGuard allows.
 */
export class StrategyAgent extends BaseAgent {
  private readonly strategyTokenId: bigint | undefined;
  private readonly maxSlippageBps: number;

  constructor(config: StrategyAgentConfig) {
    super(config);
    this.strategyTokenId = config.strategyTokenId;
    this.maxSlippageBps = config.maxSlippageBps ?? 50;
  }

  /**
   * Generate signal: override with real logic (e.g. price threshold, volatility).
   * Example returns null (no trade); implement your strategy.
   */
  async generateSignal(): Promise<ExecutionSignal | null> {
    if (this.strategyTokenId != null) {
      const signer = this.client.signer;
      if (signer) {
        const status = await this.client.strategies.getSubscriptionStatus(
          await signer.getAddress(),
          this.strategyTokenId
        );
        if (!status.active) {
          this.logger.warn("Subscription not active", { strategyTokenId: this.strategyTokenId.toString() });
          return null;
        }
      }
    }
    return null;
  }

  protected getSpendAmountFromSignal(signal: ExecutionSignal): bigint {
    if (signal.type === "swap" && signal.payload && typeof signal.payload === "object" && "amountIn" in signal.payload) {
      return BigInt((signal.payload as { amountIn: bigint }).amountIn.toString());
    }
    return 0n;
  }

  protected async submitExecution(signal: ExecutionSignal): Promise<boolean> {
    if (signal.type === "swap" && signal.payload && typeof signal.payload === "object") {
      const p = signal.payload as {
        tokenIn: string;
        tokenOut: string;
        fee: number;
        recipient: string;
        amountIn: bigint;
        amountOutMinimum: bigint;
        beneficiary: string;
      };
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
      await this.client.execution.swapExactInputSingleWithSlippage({
        exactInputSingle: {
          tokenIn: p.tokenIn,
          tokenOut: p.tokenOut,
          fee: p.fee,
          recipient: p.recipient,
          amountIn: p.amountIn,
          amountOutMinimum: p.amountOutMinimum ?? 0n,
        },
        deadline,
        beneficiary: p.beneficiary,
        slippageBps: this.maxSlippageBps,
      });
      return true;
    }
    return false;
  }
}
