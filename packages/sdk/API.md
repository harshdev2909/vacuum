# API Reference

## ArbiClient

Main entry. Constructor:

- `config.rpcUrl: string` — RPC URL
- `config.chainId: number` — Chain ID
- `config.signer?: Signer | null` — Optional ethers Signer
- `config.addresses?: AddressConfig` — Optional contract address overrides

Properties: `execution`, `vaults`, `strategies`, `dao`, `agents`. Getters: `chainId`, `provider`, `signer`, `addresses`.

---

## ExecutionModule

- **getExecutionNonce(owner: string): Promise\<bigint\>**
- **getWethAddress(): Promise\<string\>**
- **simulateSwap(params: SwapParams): Promise\<QuoteResult\>**
- **getQuote(params: { exactInputSingle, beneficiary }): Promise\<QuoteResult\>**
- **swapExactInputSingle(params: SwapParams): Promise\<{ amountOut, txHash }\>**
- **swapExactInputSingleWithSlippage(params & { slippageBps }): Promise\<{ amountOut, txHash }\>**
- **approveToken(tokenAddress, amount, spender?): Promise\<{ txHash }\>**
- **estimateSwapGas(params): Promise\<bigint\>**
- **getUserTrades(address): Promise\<Array\<{ txHash, amountIn, amountOut }\>\>** — Returns empty; implement via events if needed.

**SwapParams:** `exactInputSingle` (tokenIn, tokenOut, fee, recipient, amountIn, amountOutMinimum, sqrtPriceLimitX96?), `deadline`, `beneficiary`, `minAmountOutAfterFee`, `nonce?`.

**QuoteResult:** `amountOut`, `amountIn`, `priceImpactBps?`.

---

## VaultModule

- **getVaultInfo(vaultAddress?): Promise\<VaultInfo\>**
- **previewDeposit(assets, vaultAddress?): Promise\<bigint\>**
- **previewWithdraw(shares, vaultAddress?): Promise\<bigint\>**
- **getUserPosition(userAddress, vaultAddress?): Promise\<UserPosition\>**
- **deposit(assets, receiver, vaultAddress?): Promise\<{ shares, txHash }\>**
- **withdraw(assets, receiver, owner, vaultAddress?): Promise\<{ shares, txHash }\>**
- **redeem(shares, receiver, owner, vaultAddress?): Promise\<{ assets, txHash }\>**
- **getAssetAllowance(owner, vaultAddress?): Promise\<bigint\>**

**VaultInfo:** address, asset, totalAssets, totalSupply, symbol, depositCap, performanceFeeBps, withdrawalFeeBps, paused, strategyActive, treasury.

**UserPosition:** vaultAddress, shares, assets, maxDeposit, maxWithdraw, maxRedeem.

---

## StrategyModule

- **registerStrategy(params: RegisterStrategyParams): Promise\<{ tokenId, txHash }\>**
- **getTokenId(strategyAddress): Promise\<bigint\>**
- **subscribe(strategyTokenId, durationSeconds, paymentToken, amount): Promise\<{ txHash }\>**
- **cancelSubscription(strategyTokenId): Promise\<{ txHash }\>**
- **getSubscriptionStatus(user, strategyTokenId): Promise\<SubscriptionStatus\>**
- **getStrategyMetadata(tokenId): Promise\<string\>**
- **listMarketplace(tokenId, paymentToken, price): Promise\<{ txHash }\>**
- **cancelListing(tokenId): Promise\<{ txHash }\>**
- **getListing(tokenId): Promise\<ListingInfo | null\>**
- **buyStrategy(tokenId, affiliate?): Promise\<{ txHash }\>**
- **claimRoyalty(token): Promise\<{ txHash }\>**
- **getClaimableRoyalty(account, token): Promise\<bigint\>**

**RegisterStrategyParams:** strategy, creator, strategyType (0|1), riskLevel, performanceMetricsHash, metadataURI.

**SubscriptionStatus:** active, expiryTimestamp, strategyTokenId.

**ListingInfo:** seller, paymentToken, price.

---

## DaoModule

- **getPolicyStatus(): Promise\<RiskGuardStatus\>**
- **canExecute(strategyOrTarget, spendAmount): Promise\<boolean\>**
- **createRule(ruleId, conditionType, conditionParams, executionLimitPerPeriod, periodSeconds): Promise\<{ txHash }\>**
- **triggerRule(ruleId, executionPayload): Promise\<{ success, txHash }\>**
- **getRule(ruleId): Promise\<PolicyRule\>**
- **getRuleIds(): Promise\<string[]\>**
- **getTreasuryExposure(tokens): Promise\<TreasuryExposure[]\>**
- **getTreasuryAddress(): Promise\<string\>**
- **getBuybackSchedules(): Promise\<BuybackSchedule[]\>**
- **getExecutor(): Promise\<string\>**

**RiskGuardStatus:** maxDailySpend, maxSlippageBps, currentDaySpend, paused.

**PolicyRule:** exists, disabled, conditionType, conditionParams, executionLimitPerPeriod, periodSeconds, executionsInCurrentPeriod, periodStartTimestamp, lastTriggerTimestamp.

**TreasuryExposure:** token, amount.

**BuybackSchedule:** scheduleId, exists, cancelled, treasury, paymentToken, tokenToBuy, totalAmount, chunks, intervalSeconds, chunksExecuted, nextExecutionTime.

---

## AgentsModule

- **registerAgent(agentId, metadataURI): Promise\<{ txHash }\>**
- **updateAgent(agentId, metadataURI, active): Promise\<{ txHash }\>**
- **deactivateAgent(agentId): Promise\<{ txHash }\>**
- **getAgentMetadata(agentId): Promise\<AgentInfo\>**
- **isAgentActive(agentId): Promise\<boolean\>**
- **stakeAgent(agentId, amount): Promise\<{ txHash }\>** — Requires AgentStaking configured.
- **unstakeAgent(agentId, amount): Promise\<{ txHash }\>**
- **getAgentPerformance(agentId, userAddress): Promise\<AgentPerformance | null\>**
- **subscribeToAgent(agentId, durationSeconds, paymentToken, amount): Promise\<{ txHash }\>**
- **getAgentSubscriptionStatus(user, agentId): Promise\<{ active, expiry }\>**
- **claimAgentRevenue(token): Promise\<{ txHash }\>**
- **getClaimableAgentRevenue(account, token): Promise\<bigint\>**

**AgentInfo:** agentId, creator, metadataURI, active.

**AgentPerformance:** agentId, totalStake, userStake, meetsMinimumStake.

---

## Utils

- **applySlippageBps(amountOut, slippageBps): bigint**
- **priceImpactBps(expected, actual): number**
- **toRuleId(id: string): string**
- **toAgentId(id: string): string**
- **encodePayload(data: string | Uint8Array): string**

---

## Errors

- **VacuumError** (code: VACUUM_ERROR)
- **ContractError** (code: CONTRACT_ERROR, optional txHash)
- **SignerError** (code: SIGNER_ERROR)
- **ValidationError** (code: VALIDATION_ERROR, optional field)
- **SimulationError** (code: SIMULATION_ERROR)
- **PolicyError** (code: POLICY_ERROR)

All extend Error and have a `.code` string property.
