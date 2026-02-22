/**
 * Shared types and interfaces for the Vacuum SDK.
 */

import type { BigNumberish } from "ethers";

/** Chain and RPC configuration. */
export interface ChainConfig {
  chainId: number;
  rpcUrl: string;
}

/** Ethers v6 signer (Wallet or JsonRpcSigner). */
export type SignerLike = import("ethers").Wallet | import("ethers").JsonRpcSigner;

/** Provider (ethers AbstractProvider). */
export type ProviderLike = import("ethers").Provider;

/** ExactInputSingle params for Uniswap V3–style swap. */
export interface ExactInputSingleParams {
  tokenIn: string;
  tokenOut: string;
  fee: number;
  recipient: string;
  amountIn: BigNumberish;
  amountOutMinimum: BigNumberish;
  sqrtPriceLimitX96?: BigNumberish;
}

/** Swap execution params (router + beneficiary + fee). */
export interface SwapParams {
  exactInputSingle: ExactInputSingleParams;
  deadline: BigNumberish;
  beneficiary: string;
  minAmountOutAfterFee: BigNumberish;
  nonce?: BigNumberish;
}

/** Quote result for a swap. */
export interface QuoteResult {
  amountOut: bigint;
  amountIn: bigint;
  priceImpactBps?: number;
}

/** Vault info (ERC-4626 + protocol fields). */
export interface VaultInfo {
  address: string;
  asset: string;
  totalAssets: bigint;
  totalSupply: bigint;
  symbol: string;
  depositCap: bigint;
  performanceFeeBps: bigint;
  withdrawalFeeBps: bigint;
  paused: boolean;
  strategyActive: boolean;
  treasury: string;
}

/** User position in a vault. */
export interface UserPosition {
  vaultAddress: string;
  shares: bigint;
  assets: bigint;
  maxDeposit: bigint;
  maxWithdraw: bigint;
  maxRedeem: bigint;
}

/** Strategy registration params. */
export interface RegisterStrategyParams {
  strategy: string;
  creator: string;
  strategyType: 0 | 1;
  riskLevel: number;
  performanceMetricsHash: string;
  metadataURI: string;
}

/** Subscription status. */
export interface SubscriptionStatus {
  active: boolean;
  expiryTimestamp: bigint;
  strategyTokenId: bigint;
}

/** Marketplace listing. */
export interface ListingInfo {
  seller: string;
  paymentToken: string;
  price: bigint;
}

/** Policy rule (from PolicyEngine). */
export interface PolicyRule {
  exists: boolean;
  disabled: boolean;
  conditionType: number;
  conditionParams: string;
  executionLimitPerPeriod: bigint;
  periodSeconds: bigint;
  executionsInCurrentPeriod: bigint;
  periodStartTimestamp: bigint;
  lastTriggerTimestamp: bigint;
}

/** Treasury exposure (by token). */
export interface TreasuryExposure {
  token: string;
  amount: bigint;
}

/** RiskGuard status. */
export interface RiskGuardStatus {
  maxDailySpend: bigint;
  maxSlippageBps: bigint;
  currentDaySpend: bigint;
  paused: boolean;
}

/** Buyback schedule (from BuybackModule). */
export interface BuybackSchedule {
  scheduleId: string;
  exists: boolean;
  cancelled: boolean;
  treasury: string;
  paymentToken: string;
  tokenToBuy: string;
  totalAmount: bigint;
  chunks: bigint;
  intervalSeconds: bigint;
  chunksExecuted: bigint;
  nextExecutionTime: bigint;
}

/** Agent info (from AgentRegistry). */
export interface AgentInfo {
  agentId: string;
  creator: string;
  metadataURI: string;
  active: boolean;
}

/** Agent performance / staking summary. */
export interface AgentPerformance {
  agentId: string;
  totalStake: bigint;
  userStake: bigint;
  meetsMinimumStake: boolean;
}
