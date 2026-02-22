/**
 * Base agent: abstract class for signal generation, risk check, and execution submission.
 * Agents never hold user private keys; they use the SDK client's signer (delegated).
 */

import type { ArbiClient } from "vacuum-sdk";
import type { AgentConfig, AgentLogger, ExecutionSignal, RiskEvaluation } from "./types";
import { RiskEvaluator } from "./RiskEvaluator";
import { ExecutionSigner } from "./ExecutionSigner";

const defaultLogger: AgentLogger = {
  info: (msg, meta) => console.log("[agent]", msg, meta ?? ""),
  warn: (msg, meta) => console.warn("[agent]", msg, meta ?? ""),
  error: (msg, meta) => console.error("[agent]", msg, meta ?? ""),
};

/**
 * Abstract base for strategy, vault, and DAO agents.
 * Subclasses implement evaluate() and generateSignal(); base handles start/stop, risk check, sign, submit.
 */
export abstract class BaseAgent {
  protected readonly client: ArbiClient;
  protected readonly dryRun: boolean;
  protected readonly logger: AgentLogger;
  protected readonly riskEvaluator: RiskEvaluator;
  protected readonly executionSigner: ExecutionSigner;

  private _running = false;
  private _intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: AgentConfig) {
    this.client = config.client;
    this.dryRun = config.dryRun ?? false;
    this.logger = config.logger ?? defaultLogger;
    this.riskEvaluator = new RiskEvaluator({ client: config.client });
    this.executionSigner = new ExecutionSigner({ client: config.client });
  }

  /** Start the agent loop (e.g. poll evaluate on an interval). */
  start(intervalMs?: number): void {
    if (this._running) {
      this.logger.warn("Agent already running");
      return;
    }
    this._running = true;
    this.logger.info("Agent started", { dryRun: this.dryRun });
    if (intervalMs != null && intervalMs > 0) {
      this._intervalId = setInterval(() => {
        this.evaluate().catch((err) => this.logger.error("Evaluate failed", { error: String(err) }));
      }, intervalMs);
    }
  }

  /** Stop the agent loop. */
  stop(): void {
    this._running = false;
    if (this._intervalId != null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this.logger.info("Agent stopped");
  }

  /** Whether the agent is running. */
  get running(): boolean {
    return this._running;
  }

  /**
   * Evaluate once: generate signal, check risk, optionally sign and submit.
   */
  async evaluate(): Promise<{ signal?: ExecutionSignal; submitted?: boolean; error?: string }> {
    const signal = await this.generateSignal();
    if (!signal) {
      return {};
    }
    this.logger.info("Signal generated", { type: signal.type, reason: signal.reason });
    const evaluation = await this.evaluateRisk(signal);
    if (!evaluation.allowed) {
      this.logger.warn("Execution not allowed", { reason: evaluation.reason });
      return { signal, error: evaluation.reason };
    }
    if (this.dryRun) {
      this.logger.info("Dry run: skipping submit");
      return { signal, submitted: false };
    }
    const submitted = await this.submitExecution(signal);
    return { signal, submitted };
  }

  /**
   * Override: produce a signal (e.g. swap params, harvest, trigger rule) or null if no action.
   */
  abstract generateSignal(): Promise<ExecutionSignal | null>;

  /**
   * Override: run risk evaluation for this signal (default uses RiskEvaluator with spend amount).
   */
  protected async evaluateRisk(signal: ExecutionSignal): Promise<RiskEvaluation> {
    const spendAmount = this.getSpendAmountFromSignal(signal);
    return this.riskEvaluator.evaluate(spendAmount);
  }

  /**
   * Override: extract spend amount (wei) from signal for RiskGuard.
   */
  protected getSpendAmountFromSignal(_signal: ExecutionSignal): bigint {
    return 0n;
  }

  /**
   * Override: submit the execution (e.g. call SDK execution.swap or dao.triggerRule).
   */
  protected abstract submitExecution(signal: ExecutionSignal): Promise<boolean>;
}
