/**
 * vacuum-sdk — TypeScript SDK for Vacuum protocol on Arbitrum.
 *
 * Entry point: ArbiClient. Use execution, vaults, strategies, dao, and agents modules.
 */

export { ArbiClient } from "./core/ArbiClient";
export type { ArbiClientConfig } from "./core/ArbiClient";

export { ExecutionModule } from "./execution/ExecutionModule";
export type { ExecutionConfig } from "./execution/ExecutionModule";

export { VaultModule } from "./vaults/VaultModule";
export type { VaultConfig } from "./vaults/VaultModule";

export { StrategyModule } from "./strategy/StrategyModule";
export type { StrategyConfig } from "./strategy/StrategyModule";

export { DaoModule } from "./dao/DaoModule";
export type { DaoConfig } from "./dao/DaoModule";

export { AgentsModule } from "./agents/AgentsModule";
export type { AgentsConfig } from "./agents/AgentsModule";

export {
  VacuumError,
  ContractError,
  SignerError,
  ValidationError,
  SimulationError,
  PolicyError,
} from "./errors";

export type {
  ChainConfig,
  ExactInputSingleParams,
  SwapParams,
  QuoteResult,
  VaultInfo,
  UserPosition,
  RegisterStrategyParams,
  SubscriptionStatus,
  ListingInfo,
  PolicyRule,
  TreasuryExposure,
  RiskGuardStatus,
  BuybackSchedule,
  AgentInfo,
  AgentPerformance,
} from "./types";

export {
  applySlippageBps,
  priceImpactBps,
  toRuleId,
  toAgentId,
  encodePayload,
} from "./utils";

export {
  DEFAULT_ADDRESSES,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  type AddressConfig,
} from "./constants";
