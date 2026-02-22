/**
 * Shared types for Private RPC + MEV Protection Execution Engine.
 */

/** Raw signed tx (hex). */
export interface RawTxPayload {
  method: "eth_sendRawTransaction";
  params: [string];
}

/** EIP-712 signed execution request (e.g. ExecutionRouter params + signature). */
export interface EIP712ExecutionPayload {
  method: "vacuum_execute";
  params: {
    /** Serialized ExecutionRouter.executeExactInputSingle params + deadline, beneficiary, nonce, etc. */
    data: string;
    /** EIP-712 signature hex */
    signature?: string;
    /** Optional: raw signed tx if already built client-side */
    rawTransaction?: string;
  };
}

/** Internal queue item. */
export interface QueuedTx {
  id: string;
  /** eth_sendRawTransaction hex or built from EIP-712. */
  rawTx: string;
  /** When enqueued (ISO). */
  enqueuedAt: string;
  /** API key id (hash or label) for rate limit. */
  apiKeyId: string;
  /** Optional nonce used (for replay check). */
  nonce?: number;
  /** Optional from address (recovered). */
  from?: string;
}

/** Simulation result. */
export interface SimulationResult {
  success: boolean;
  expectedOutput?: bigint;
  gasEstimate?: bigint;
  revertReason?: string;
  /** Simulated call reverted. */
  reverted?: boolean;
}

/** MEV risk action. */
export type MevAction = "bundle" | "increaseGas" | "safe" | "reject";

/** MEV guard evaluation. */
export interface MevGuardResult {
  riskScore: number;
  action: MevAction;
  reason?: string;
  /** Suggested priority fee multiplier when action is increaseGas. */
  suggestedGasMultiplier?: number;
}

/** Pool / swap activity for one pool (token pair + fee). */
export interface PoolActivity {
  poolKey: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  totalAmountIn: bigint;
  totalAmountOut: bigint;
  txCount: number;
  blockNumber: number;
  lastUpdated: number;
}

/** Mempool snapshot passed to MEV guard. */
export interface MempoolSnapshot {
  pendingSwaps: PendingSwap[];
  poolActivity: Map<string, PoolActivity>;
  baseFeePerGas: bigint;
  blockNumber: number;
}

export interface PendingSwap {
  hash: string;
  from: string;
  to: string;
  value: bigint;
  data: string;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  decoded?: SwapDecoded;
}

/** Decoded swap (Uniswap V3 / Camelot style). */
export interface SwapDecoded {
  router: string;
  tokenIn: string;
  tokenOut: string;
  fee?: number;
  amountIn: bigint;
  amountOutMinimum?: bigint;
  path?: string;
}

/** Gas recommendation. */
export interface GasRecommendation {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  gasLimit: bigint;
}

/** Broadcast result. */
export interface BroadcastResult {
  success: boolean;
  txHash?: string;
  error?: string;
  /** Whether fallback (public RPC) was used. */
  usedFallback?: boolean;
}
