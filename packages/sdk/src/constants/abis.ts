/**
 * Minimal ABIs for SDK contract calls.
 * Full ABIs live in the protocol repo; these cover SDK-used functions only.
 */

export const EXECUTION_ROUTER_ABI = [
  "function executeExactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params, uint256 deadline, address beneficiary, uint256 minAmountOutAfterFee, uint256 nonce) payable returns (uint256 amountOut)",
  "function executionNonces(address owner) view returns (uint256)",
  "function weth() view returns (address)",
] as const;

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
] as const;

export const VAULT_ABI = [
  "function asset() view returns (address)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256)",
  "function maxDeposit(address owner) view returns (uint256)",
  "function maxWithdraw(address owner) view returns (uint256)",
  "function maxRedeem(address owner) view returns (uint256)",
  "function depositCap() view returns (uint256)",
  "function performanceFeeBps() view returns (uint256)",
  "function withdrawalFeeBps() view returns (uint256)",
  "function paused() view returns (bool)",
  "function strategyActive() view returns (bool)",
  "function symbol() view returns (string)",
  "function treasury() view returns (address)",
  "function harvest()",
] as const;

export const STRATEGY_REGISTRY_ABI = [
  "function register(address strategy, address creator, uint8 strategyType, uint8 riskLevel, bytes32 performanceMetricsHash, string metadataURI) returns (uint256)",
  "function getTokenId(address strategy) view returns (uint256)",
  "function getActiveVersion(address strategy) view returns (uint256)",
  "function owner() view returns (address)",
] as const;

export const STRATEGY_SUBSCRIPTION_ABI = [
  "function subscribe(uint256 strategyTokenId, uint256 durationSeconds, address paymentToken, uint256 amount)",
  "function cancel(uint256 strategyTokenId)",
  "function isSubscriptionActive(address user, uint256 strategyTokenId) view returns (bool)",
  "function subscriptionExpiry(address user, uint256 strategyTokenId) view returns (uint256)",
] as const;

export const STRATEGY_NFT_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function strategyByToken(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
] as const;

export const STRATEGY_MARKETPLACE_ABI = [
  "function list(uint256 tokenId, address paymentToken, uint256 price)",
  "function cancelListing(uint256 tokenId)",
  "function buy(uint256 tokenId, address affiliate)",
  "function getListing(uint256 tokenId) view returns (address seller, address paymentToken, uint256 price)",
] as const;

export const ROYALTY_DISTRIBUTOR_ABI = [
  "function claimable(address account, address token) view returns (uint256)",
  "function claim(address token)",
] as const;

export const RISK_GUARD_ABI = [
  "function maxDailySpend() view returns (uint256)",
  "function maxSlippageBps() view returns (uint256)",
  "function getCurrentDaySpend() view returns (uint256)",
  "function canExecute(address strategyOrTarget, uint256 spendAmount) view returns (bool)",
  "function paused() view returns (bool)",
  "function owner() view returns (address)",
] as const;

export const POLICY_ENGINE_ABI = [
  "function getRuleIds() view returns (bytes32[])",
  "function getRule(bytes32 ruleId) view returns (bool exists, bool disabled, uint8 conditionType, bytes conditionParams, uint256 executionLimitPerPeriod, uint256 periodSeconds, uint256 executionsInCurrentPeriod, uint256 periodStartTimestamp, uint256 lastTriggerTimestamp)",
  "function evaluateCondition(bytes32 ruleId) view returns (bool)",
  "function setRule(bytes32 ruleId, uint8 conditionType, bytes conditionParams, uint256 executionLimitPerPeriod, uint256 periodSeconds)",
  "function triggerRule(bytes32 ruleId, bytes executionPayload) returns (bool)",
  "function owner() view returns (address)",
] as const;

export const TREASURY_AUTOMATION_CONTROLLER_ABI = [
  "function treasury() view returns (address)",
  "function exposureByToken(address token) view returns (uint256)",
  "function executeAutomatedSwap(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params, uint256 deadline, uint256 minAmountOutAfterFee, uint256 expectedAmountOut) payable returns (uint256)",
  "function executeVaultHarvest(address vault)",
  "function owner() view returns (address)",
] as const;

export const BUYBACK_MODULE_ABI = [
  "function getScheduleIds() view returns (bytes32[])",
  "function getSchedule(bytes32 scheduleId) view returns (bool exists, bool cancelled, address treasury, address paymentToken, address tokenToBuy, uint256 totalAmount, uint256 chunks, uint256 intervalSeconds, uint256 maxGasLimit, uint256 chunksExecuted, uint256 nextExecutionTime, uint256 lastChunkAt)",
  "function createSchedule(bytes32 scheduleId, address paymentToken, address tokenToBuy, uint256 totalAmount, uint256 chunks, uint256 intervalSeconds, uint256 maxGasLimit)",
  "function cancelSchedule(bytes32 scheduleId)",
  "function owner() view returns (address)",
] as const;

export const GOVERNANCE_EXECUTOR_ADAPTER_ABI = [
  "function executor() view returns (address)",
  "function setExecutor(address executor)",
  "function execute(address target, uint256 value, bytes data) returns (bytes)",
  "function owner() view returns (address)",
] as const;

export const FEE_MANAGER_ABI = [
  "function protocolFeeBps() view returns (uint256)",
  "function referralSplitBps() view returns (uint256)",
  "function treasury() view returns (address)",
  "function totalFeesCollected(address token) view returns (uint256)",
  "function withdrawToTreasury(address token, uint256 amount)",
] as const;

/** Phase 5 Agent contracts — minimal ABIs */
export const AGENT_REGISTRY_ABI = [
  "function registerAgent(bytes32 agentId, string metadataURI)",
  "function updateAgent(bytes32 agentId, string metadataURI, bool active)",
  "function deactivateAgent(bytes32 agentId)",
  "function getAgent(bytes32 agentId) view returns (address creator, string metadataURI, bool active)",
  "function isActive(bytes32 agentId) view returns (bool)",
] as const;

export const AGENT_STAKING_ABI = [
  "function stake(bytes32 agentId, uint256 amount)",
  "function unstake(bytes32 agentId, uint256 amount)",
  "function stakeOf(bytes32 agentId, address account) view returns (uint256)",
  "function totalStake(bytes32 agentId) view returns (uint256)",
  "function setMinimumStake(bytes32 agentId, uint256 amount)",
  "function meetsMinimumStake(bytes32 agentId) view returns (bool)",
  "function slash(bytes32 agentId, uint256 amount)",
] as const;

export const AGENT_REVENUE_DISTRIBUTOR_ABI = [
  "function receiveRevenue(bytes32 agentId, address token, uint256 amount)",
  "function claimable(address account, address token) view returns (uint256)",
  "function claim(address token)",
] as const;

export const AGENT_SUBSCRIPTION_MANAGER_ABI = [
  "function subscribe(bytes32 agentId, uint256 durationSeconds, address paymentToken, uint256 amount)",
  "function isSubscriptionActive(address user, bytes32 agentId) view returns (bool)",
  "function subscriptionExpiry(address user, bytes32 agentId) view returns (uint256)",
] as const;
