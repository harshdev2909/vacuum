# Phase 4 — DAO Automation & Phase 5 — Agent Marketplace

Production-grade DAO automation (risk guard, policy engine, treasury controller, buyback, governance adapter) and agent marketplace (registry, staking, revenue, subscriptions) with SDK-compatible interfaces.

---

## Phase 4 — DAO Automation

### Contracts

| Contract | Description |
|----------|-------------|
| **RiskGuard** | Max daily spend, max slippage (BPS), strategy whitelist, pause. `validateExecution` (view) and `recordSpend` (controller only). |
| **PolicyEngine** | Rules with condition types (Always, TimestampAfter, IntervalElapsed). Execution limits per period. Keeper triggers `triggerRule(ruleId, payload)`. Emits `RuleTriggered`. |
| **TreasuryAutomationController** | Connects to ExecutionRouter and optional vaults. `executeAutomatedSwap(params, deadline, minOut, expectedOut)` enforces RiskGuard, calls router (treasury = beneficiary), records spend, tracks exposure. `executeVaultHarvest(vault)` for whitelisted vaults. |
| **BuybackModule** | TWAP-style buybacks: create schedule (paymentToken, tokenToBuy, totalAmount, chunks, intervalSeconds, maxGasLimit). `executeBuybackChunk(scheduleId, params, deadline, minOut)` runs one chunk; checks treasury balance and gas limit. |
| **GovernanceExecutorAdapter** | Single executor (e.g. TimelockController). `execute(target, value, data)` only callable by executor. Timelock pattern: Governor proposes → Timelock executes → adapter.execute(...). |

### Flow

1. **RiskGuard**: Owner sets `maxDailySpend`, `maxSlippageBps`, whitelists strategy/target addresses, sets `automationController`. Controller calls `validateExecution` before execution and `recordSpend` after success.
2. **PolicyEngine**: Owner creates rules; keeper or anyone calls `triggerRule(ruleId, payload)`. Conditions and execution limits enforced. Use payload for off-chain executor (e.g. encode target + calldata for TreasuryAutomationController).
3. **TreasuryAutomationController**: Treasury must approve ExecutionRouter for input token and authorize controller via WalletAuthorization (EIP-712). Owner calls `executeAutomatedSwap`; controller calls router with beneficiary = treasury.
4. **BuybackModule**: Owner creates schedules; owner/keeper calls `executeBuybackChunk` per interval. Treasury must approve router; WalletAuth must authorize BuybackModule for treasury.
5. **GovernanceExecutorAdapter**: Owner sets `executor` (e.g. Timelock). Only executor can call `execute(target, value, data)`.

### Deployment (Phase 4)

```bash
export TREASURY_ADDRESS=0x...
export EXECUTION_ROUTER_ADDRESS=0x...  # optional
npx hardhat run scripts/deploy-phase4.ts --network arbitrum-sepolia
```

Then: set RiskGuard’s `automationController` to the deployed controller; whitelist ExecutionRouter (or desired target); set Governor/Timelock as adapter’s `executor`.

---

## Phase 5 — Agent Marketplace

### Contracts

| Contract | Description |
|----------|-------------|
| **AgentRegistry** | `registerAgent(agentId, metadataURI)` by creator; `updateAgent` / `deactivateAgent` by creator or owner. `getAgent`, `isActive`, `creatorOf`. |
| **AgentStaking** | Stake ERC20 to activate agent. `stake(agentId, amount)`, `unstake(agentId, amount)` after lock period. `slash(agentId, amount)` (owner). `minimumStakeForAgent`, `meetsMinimumStake`. |
| **AgentRevenueDistributor** | `receiveRevenue(agentId, token, amount)` — splits to agent creator (agentBps) and protocol (protocolBps). `claimable(account, token)`, `claim(token)`. |
| **AgentSubscriptionManager** | `subscribe(agentId, durationSeconds, paymentToken, amount)` — payment goes to AgentRevenueDistributor; user gets expiry. `cancel(agentId)`. `isSubscriptionActive`, `subscriptionExpiry`. |

### SDK-compatible interfaces

- **IAgentRegistry**: registerAgent, updateAgent, deactivateAgent, getAgent, isActive, creatorOf, Agent struct, events.
- **IAgentStaking**: stake, unstake, slash, stakeOf, totalStake, meetsMinimumStake, events.
- **IAgentRevenueDistributor**: receiveRevenue, claimable, claim, events.
- **IAgentSubscriptionManager**: subscribe, cancel, isSubscriptionActive, subscriptionExpiry, events.

### Flow

1. Creator registers agent → AgentRegistry. Optionally stake (AgentStaking) to meet minimum.
2. Users subscribe via AgentSubscriptionManager (ERC20 payment → revenue distributor).
3. Revenue sent to AgentRevenueDistributor.receiveRevenue(agentId, token, amount) → split to creator and protocol; claimable and claim.
4. Enforce subscription in execution layer (e.g. check `subscriptionManager.isSubscriptionActive(user, agentId)` before running agent logic).

### Deployment (Phase 5)

```bash
export PROTOCOL_TREASURY=0x...
export STAKING_TOKEN=0x...  # optional; if not set, AgentStaking not deployed
npx hardhat run scripts/deploy-phase5.ts --network arbitrum-sepolia
```

---

## Tests

- **Phase 4**: `npx hardhat test test/unit/Phase4DAO.test.ts`  
  RiskGuard (daily spend, whitelist, pause), PolicyEngine (rule trigger, limits), TreasuryAutomationController (executeAutomatedSwap with ExecutionRouter), BuybackModule (schedule), GovernanceExecutorAdapter (executor-only execute).
- **Phase 5**: `npx hardhat test test/unit/Phase5Agent.test.ts`  
  AgentRegistry (register, update, deactivate), AgentStaking (stake, unstake, slash), AgentRevenueDistributor (receiveRevenue, claim), AgentSubscriptionManager (subscribe, cancel).

---

## Security

- **Phase 4**: RiskGuard restricts controller; controller is owner-only for execute. Adapter restricts to single executor. Buyback checks treasury balance and gas limit.
- **Phase 5**: Registry: creator or owner for update/deactivate. Staking: lock period before unstake; slash owner-only. Revenue: BPS caps (Phase5Constants). Subscription: payment to revenue distributor; no double-count.

---

## File layout

```
contracts/
├── dao/
│   ├── RiskGuard.sol
│   ├── PolicyEngine.sol
│   ├── TreasuryAutomationController.sol
│   ├── BuybackModule.sol
│   └── GovernanceExecutorAdapter.sol
├── agent/
│   ├── IAgentRegistry.sol
│   ├── IAgentStaking.sol
│   ├── IAgentRevenueDistributor.sol
│   ├── IAgentSubscriptionManager.sol
│   ├── AgentRegistry.sol
│   ├── AgentStaking.sol
│   ├── AgentRevenueDistributor.sol
│   └── AgentSubscriptionManager.sol
├── interfaces/
│   └── IExecutionRouter.sol
└── libraries/
    ├── Phase4Constants.sol
    └── Phase5Constants.sol
scripts/
├── deploy-phase4.ts
└── deploy-phase5.ts
test/unit/
├── Phase4DAO.test.ts
└── Phase5Agent.test.ts
```
