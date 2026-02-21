/** Phase 4: DAO Automation ABIs (minimal for frontend) */

export const RISK_GUARD_ABI = [
  { inputs: [], name: "maxDailySpend", outputs: [{ type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "maxSlippageBps", outputs: [{ type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getCurrentDaySpend", outputs: [{ type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "strategyOrTarget_", type: "address", internalType: "address" }, { name: "spendAmount_", type: "uint256", internalType: "uint256" }], name: "canExecute", outputs: [{ type: "bool", internalType: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "address", internalType: "address" }], name: "whitelistedStrategies", outputs: [{ type: "bool", internalType: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool", internalType: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "amount_", type: "uint256", internalType: "uint256" }], name: "setMaxDailySpend", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "bps_", type: "uint256", internalType: "uint256" }], name: "setMaxSlippageBps", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "strategy_", type: "address", internalType: "address" }, { name: "allowed_", type: "bool", internalType: "bool" }], name: "setStrategyWhitelisted", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
] as const;

export const POLICY_ENGINE_ABI = [
  { inputs: [], name: "getRuleIds", outputs: [{ type: "bytes32[]", internalType: "bytes32[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "ruleId_", type: "bytes32", internalType: "bytes32" }], name: "getRule", outputs: [{ type: "bool", name: "exists", internalType: "bool" }, { type: "bool", name: "disabled", internalType: "bool" }, { type: "uint8", name: "conditionType", internalType: "uint8" }, { type: "bytes", name: "conditionParams", internalType: "bytes" }, { type: "uint256", name: "executionLimitPerPeriod", internalType: "uint256" }, { type: "uint256", name: "periodSeconds", internalType: "uint256" }, { type: "uint256", name: "executionsInCurrentPeriod", internalType: "uint256" }, { type: "uint256", name: "periodStartTimestamp", internalType: "uint256" }, { type: "uint256", name: "lastTriggerTimestamp", internalType: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "ruleId_", type: "bytes32", internalType: "bytes32" }], name: "evaluateCondition", outputs: [{ type: "bool", internalType: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "ruleId_", type: "bytes32", internalType: "bytes32" }, { name: "conditionType_", type: "uint8", internalType: "uint8" }, { name: "conditionParams_", type: "bytes", internalType: "bytes" }, { name: "executionLimitPerPeriod_", type: "uint256", internalType: "uint256" }, { name: "periodSeconds_", type: "uint256", internalType: "uint256" }], name: "setRule", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "ruleId_", type: "bytes32", internalType: "bytes32" }], name: "disableRule", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "ruleId_", type: "bytes32", internalType: "bytes32" }, { name: "executionPayload_", type: "bytes", internalType: "bytes" }], name: "triggerRule", outputs: [{ type: "bool", internalType: "bool" }], stateMutability: "nonpayable", type: "function" },
] as const;

export const TREASURY_AUTOMATION_CONTROLLER_ABI = [
  { inputs: [], name: "treasury", outputs: [{ type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "executionRouter", outputs: [{ type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "address", internalType: "address" }], name: "exposureByToken", outputs: [{ type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "params_", type: "tuple", internalType: "struct IV3SwapRouter.ExactInputSingleParams", components: [{ name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "fee", type: "uint24" }, { name: "recipient", type: "address" }, { name: "amountIn", type: "uint256" }, { name: "amountOutMinimum", type: "uint256" }, { name: "sqrtPriceLimitX96", type: "uint160" }] }, { name: "deadline_", type: "uint256", internalType: "uint256" }, { name: "minAmountOutAfterFee_", type: "uint256", internalType: "uint256" }, { name: "expectedAmountOut_", type: "uint256", internalType: "uint256" }], name: "executeAutomatedSwap", outputs: [{ type: "uint256", name: "amountOut", internalType: "uint256" }], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "vault_", type: "address", internalType: "address" }], name: "executeVaultHarvest", outputs: [], stateMutability: "nonpayable", type: "function" },
] as const;

export const BUYBACK_MODULE_ABI = [
  { inputs: [], name: "getScheduleIds", outputs: [{ type: "bytes32[]", internalType: "bytes32[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "scheduleId_", type: "bytes32", internalType: "bytes32" }], name: "getSchedule", outputs: [{ type: "bool", name: "exists", internalType: "bool" }, { type: "bool", name: "cancelled", internalType: "bool" }, { type: "address", name: "treasury", internalType: "address" }, { type: "address", name: "paymentToken", internalType: "address" }, { type: "address", name: "tokenToBuy", internalType: "address" }, { type: "uint256", name: "totalAmount", internalType: "uint256" }, { type: "uint256", name: "chunks", internalType: "uint256" }, { type: "uint256", name: "intervalSeconds", internalType: "uint256" }, { type: "uint256", name: "maxGasLimit", internalType: "uint256" }, { type: "uint256", name: "chunksExecuted", internalType: "uint256" }, { type: "uint256", name: "nextExecutionTime", internalType: "uint256" }, { type: "uint256", name: "lastChunkAt", internalType: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "scheduleId_", type: "bytes32", internalType: "bytes32" }, { name: "paymentToken_", type: "address", internalType: "address" }, { name: "tokenToBuy_", type: "address", internalType: "address" }, { name: "totalAmount_", type: "uint256", internalType: "uint256" }, { name: "chunks_", type: "uint256", internalType: "uint256" }, { name: "intervalSeconds_", type: "uint256", internalType: "uint256" }, { name: "maxGasLimit_", type: "uint256", internalType: "uint256" }], name: "createSchedule", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "scheduleId_", type: "bytes32", internalType: "bytes32" }], name: "cancelSchedule", outputs: [], stateMutability: "nonpayable", type: "function" },
] as const;

export const GOVERNANCE_EXECUTOR_ADAPTER_ABI = [
  { inputs: [], name: "executor", outputs: [{ type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "executor_", type: "address", internalType: "address" }], name: "setExecutor", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "target_", type: "address", internalType: "address" }, { name: "value_", type: "uint256", internalType: "uint256" }, { name: "data_", type: "bytes", internalType: "bytes" }], name: "execute", outputs: [{ type: "bytes", internalType: "bytes" }], stateMutability: "nonpayable", type: "function" },
] as const;
