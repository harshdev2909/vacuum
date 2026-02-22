import type { QueuedTx } from "../types.js";
import type { SimulationResult } from "../types.js";
import type { MevGuardResult } from "../types.js";
import type { BroadcastResult } from "../types.js";

/**
 * Configurable strategy hooks (e.g. for custom risk rules or alerting).
 * Set on config or inject into worker.
 */
export interface StrategyHooks {
  /** Before simulation. Return false to skip and reject. */
  beforeSimulation?(queued: QueuedTx): Promise<boolean> | boolean;
  /** After simulation. Return false to reject. */
  afterSimulation?(queued: QueuedTx, result: SimulationResult): Promise<boolean> | boolean;
  /** After MEV evaluation. Return overridden action or undefined to use default. */
  afterMevEvaluation?(queued: QueuedTx, mev: MevGuardResult): Promise<MevGuardResult | undefined> | MevGuardResult | undefined;
  /** Before broadcast. Return false to cancel. */
  beforeBroadcast?(queued: QueuedTx, rawTx: string): Promise<boolean> | boolean;
  /** After broadcast. */
  afterBroadcast?(queued: QueuedTx, result: BroadcastResult): Promise<void> | void;
}

const noop = () => {};
export const defaultHooks: StrategyHooks = {};

export function runBeforeSimulation(queued: QueuedTx, hooks: StrategyHooks): Promise<boolean> {
  const fn = hooks.beforeSimulation ?? (() => true);
  return Promise.resolve(fn(queued));
}

export function runAfterSimulation(
  queued: QueuedTx,
  result: SimulationResult,
  hooks: StrategyHooks
): Promise<boolean> {
  const fn = hooks.afterSimulation ?? (() => true);
  return Promise.resolve(fn(queued, result));
}

export function runAfterMevEvaluation(
  queued: QueuedTx,
  mev: MevGuardResult,
  hooks: StrategyHooks
): Promise<MevGuardResult> {
  const fn = hooks.afterMevEvaluation ?? (() => undefined);
  return Promise.resolve(fn(queued, mev)).then((override) => override ?? mev);
}

export function runBeforeBroadcast(
  queued: QueuedTx,
  rawTx: string,
  hooks: StrategyHooks
): Promise<boolean> {
  const fn = hooks.beforeBroadcast ?? (() => true);
  return Promise.resolve(fn(queued, rawTx));
}

export function runAfterBroadcast(
  queued: QueuedTx,
  result: BroadcastResult,
  hooks: StrategyHooks
): Promise<void> {
  const fn = hooks.afterBroadcast ?? noop;
  return Promise.resolve(fn(queued, result));
}
