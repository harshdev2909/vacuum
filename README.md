# Vacuum

Arbitrum-native execution layer and superapp: swap (Uniswap V3), ERC-4626 vaults, strategy NFTs, DAO automation, non-custodial agents, and an optional private RPC with MEV protection. Fully permissionless; no backend required for core flows. Built on ERC-20, ERC-4626, and EIP-712.

---

## Repository structure

```
arbitrum/
├── contracts/              # Solidity (Hardhat, OpenZeppelin)
│   ├── ExecutionRouter.sol, FeeManager.sol, ReferralRegistry.sol, WalletAuthorization
│   ├── vault/              # ERC-4626 vaults, BaseStrategy, UniswapV3LPStrategy
│   ├── strategy/           # StrategyNFT, StrategyRegistry
│   ├── royalty/            # RoyaltyDistributor
│   ├── subscription/       # StrategySubscriptionManager
│   ├── marketplace/        # StrategyMarketplace
│   └── dao/                # RiskGuard, PolicyEngine, TreasuryAutomationController, BuybackModule, GovernanceExecutorAdapter
├── execution-engine/       # Node.js: private RPC, Redis queue, mempool listener, MEV guard, simulation, bundler
├── packages/
│   ├── sdk/                # vacuum-sdk: TypeScript client (execution, vaults, strategies, DAO, agents)
│   └── agent/              # @vacuum/agent: non-custodial agent framework (StrategyAgent, VaultAgent, DaoAutomationAgent)
├── frontend/               # React (Vite, wagmi, RainbowKit): app UI, docs, landing, memo
└── package.json            # Workspaces: packages/sdk, packages/agent
```

Sub-project READMEs: `contracts/vault/README.md`, `execution-engine/README.md`, `packages/sdk/README.md`, `packages/agent/README.md`. Additional contract docs under `contracts/`.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Contracts | Solidity ^0.8.24, Hardhat, Ethers v6, OpenZeppelin, Hardhat Toolbox |
| Networks | Arbitrum Sepolia (testnet), Arbitrum One (mainnet); fork-based tests |
| Execution engine | Node.js, TypeScript, express, ioredis (Redis), ethers v6, pino, prom-client |
| SDK | TypeScript, ethers v6, Node and browser |
| Agents | TypeScript, vacuum-sdk, EIP-712 signing |
| Frontend | React, Vite, React Router, wagmi, RainbowKit, Tailwind-style CSS, Framer Motion |

Standards: ERC-20 (tokens), ERC-4626 (vaults), ERC-721/ERC-2981 (strategy NFTs), EIP-712 (typed signing and delegate authorization).

---

## Contract addresses and deployed links

All contracts below are deployed on **Arbitrum Sepolia** (chain ID 421614). Links point to [Arbiscan Arbitrum Sepolia](https://sepolia.arbiscan.io/).

| Contract                     | Address                                      | Deployed link                                                                                                                                                    |
| ---------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ExecutionRouter              | `0xe5f2CFeD1441010a3f79fF904dea7b09e9Ef2a8C` | [https://sepolia.arbiscan.io/address/0xe5f2CFeD1441010a3f79fF904dea7b09e9Ef2a8C](https://sepolia.arbiscan.io/address/0xe5f2CFeD1441010a3f79fF904dea7b09e9Ef2a8C) |
| FeeManager                   | `0x2f42a9F31FdDC4B882D29e7A9Ff3712f4706Bc67` | [https://sepolia.arbiscan.io/address/0x2f42a9F31FdDC4B882D29e7A9Ff3712f4706Bc67](https://sepolia.arbiscan.io/address/0x2f42a9F31FdDC4B882D29e7A9Ff3712f4706Bc67) |
| ReferralRegistry             | `0x673d380C14E9031dD3835976805a99579c679Caa` | [https://sepolia.arbiscan.io/address/0x673d380C14E9031dD3835976805a99579c679Caa](https://sepolia.arbiscan.io/address/0x673d380C14E9031dD3835976805a99579c679Caa) |
| WalletAuthorization          | `0x3d5Ca0C49c3C92b6D7619112cC071357C2DFD0AF` | [https://sepolia.arbiscan.io/address/0x3d5Ca0C49c3C92b6D7619112cC071357C2DFD0AF](https://sepolia.arbiscan.io/address/0x3d5Ca0C49c3C92b6D7619112cC071357C2DFD0AF) |
| VaultFactory                 | `0x556C7b4d4EFBCd6fea9fc93498946fB63fFADA55` | [https://sepolia.arbiscan.io/address/0x556C7b4d4EFBCd6fea9fc93498946fB63fFADA55](https://sepolia.arbiscan.io/address/0x556C7b4d4EFBCd6fea9fc93498946fB63fFADA55) |
| Vault                        | `0xaC85Ad414b9d123554DbcD9470046BA285206b7A` | [https://sepolia.arbiscan.io/address/0xaC85Ad414b9d123554DbcD9470046BA285206b7A](https://sepolia.arbiscan.io/address/0xaC85Ad414b9d123554DbcD9470046BA285206b7A) |
| StrategyRegistry             | `0x2a6EC49e2B91279b554592bd1CEdd5F98DE199cF` | [https://sepolia.arbiscan.io/address/0x2a6EC49e2B91279b554592bd1CEdd5F98DE199cF](https://sepolia.arbiscan.io/address/0x2a6EC49e2B91279b554592bd1CEdd5F98DE199cF) |
| StrategyNFT                  | `0xA7eD2A85Ac7d18bF5CcF9705700ecdd835742DdF` | [https://sepolia.arbiscan.io/address/0xA7eD2A85Ac7d18bF5CcF9705700ecdd835742DdF](https://sepolia.arbiscan.io/address/0xA7eD2A85Ac7d18bF5CcF9705700ecdd835742DdF) |
| RoyaltyDistributor           | `0x94bbC7267Ad6e96D7Dd70A468759938D2545E7d6` | [https://sepolia.arbiscan.io/address/0x94bbC7267Ad6e96D7Dd70A468759938D2545E7d6](https://sepolia.arbiscan.io/address/0x94bbC7267Ad6e96D7Dd70A468759938D2545E7d6) |
| StrategySubscriptionManager  | `0x40A6C345b6B89e11cA03F157174A7B4db1b59cDA` | [https://sepolia.arbiscan.io/address/0x40A6C345b6B89e11cA03F157174A7B4db1b59cDA](https://sepolia.arbiscan.io/address/0x40A6C345b6B89e11cA03F157174A7B4db1b59cDA) |
| StrategyMarketplace          | `0xD709d1D7c85f8eCaB1B5b0cA58CaCC7B21FB9EFD` | [https://sepolia.arbiscan.io/address/0xD709d1D7c85f8eCaB1B5b0cA58CaCC7B21FB9EFD](https://sepolia.arbiscan.io/address/0xD709d1D7c85f8eCaB1B5b0cA58CaCC7B21FB9EFD) |
| RiskGuard                    | `0x786378502e36DBD19472E18ED51fA296d54918F2` | [https://sepolia.arbiscan.io/address/0x786378502e36DBD19472E18ED51fA296d54918F2](https://sepolia.arbiscan.io/address/0x786378502e36DBD19472E18ED51fA296d54918F2) |
| PolicyEngine                 | `0xF46B8af589C6896B8c744acB3465D79AE6F57411` | [https://sepolia.arbiscan.io/address/0xF46B8af589C6896B8c744acB3465D79AE6F57411](https://sepolia.arbiscan.io/address/0xF46B8af589C6896B8c744acB3465D79AE6F57411) |
| TreasuryAutomationController | `0x6FC1E35b5e3D2c0C21Fc7B5512a8DA321662Cf95` | [https://sepolia.arbiscan.io/address/0x6FC1E35b5e3D2c0C21Fc7B5512a8DA321662Cf95](https://sepolia.arbiscan.io/address/0x6FC1E35b5e3D2c0C21Fc7B5512a8DA321662Cf95) |
| BuybackModule                | `0x251950EB71DdcAAf195e104Fb9C8A55DDb117dE8` | [https://sepolia.arbiscan.io/address/0x251950EB71DdcAAf195e104Fb9C8A55DDb117dE8](https://sepolia.arbiscan.io/address/0x251950EB71DdcAAf195e104Fb9C8A55DDb117dE8) |
| GovernanceExecutorAdapter    | `0x52aef193D52Af430a9854F72e3d96013DE7Fde36` | [https://sepolia.arbiscan.io/address/0x52aef193D52Af430a9854F72e3d96013DE7Fde36](https://sepolia.arbiscan.io/address/0x52aef193D52Af430a9854F72e3d96013DE7Fde36) |
| AgentRegistry                | `0xC9C3Be78B488349724E56A25E12Abad29F5Df80d` | [https://sepolia.arbiscan.io/address/0xC9C3Be78B488349724E56A25E12Abad29F5Df80d](https://sepolia.arbiscan.io/address/0xC9C3Be78B488349724E56A25E12Abad29F5Df80d) |
| AgentRevenueDistributor      | `0x5FeA0674926cd0A78dc97e0Be7FF3D6e6FBD4136` | [https://sepolia.arbiscan.io/address/0x5FeA0674926cd0A78dc97e0Be7FF3D6e6FBD4136](https://sepolia.arbiscan.io/address/0x5FeA0674926cd0A78dc97e0Be7FF3D6e6FBD4136) |
| AgentSubscriptionManager     | `0x37b41e1eB5C3865a03C7ab1a7b90226fE8B9F2f9` | [https://sepolia.arbiscan.io/address/0x37b41e1eB5C3865a03C7ab1a7b90226fE8B9F2f9](https://sepolia.arbiscan.io/address/0x37b41e1eB5C3865a03C7ab1a7b90226fE8B9F2f9) |

Frontend and SDK use these addresses for Arbitrum Sepolia; see `frontend/src/constants.ts`.

---

## Contracts (technical summary)

### Execution and fees

| Contract | Role |
|----------|------|
| **ExecutionRouter** | Executes swaps via Uniswap V3 SwapRouter02 (exactInputSingle, exactInput, exactOutputSingle, exactOutput). Enforces slippage and deadline; deducts protocol fee; sends referral share to ReferralRegistry and treasury share to FeeManager treasury address; emits TradeExecuted. ReentrancyGuard, Pausable, Ownable, nonce replay protection. |
| **FeeManager** | Holds protocol fee (bps), referral split (bps), treasury address, executor (ExecutionRouter). `recordFeeCollected(token, from, totalFeeAmount, referralAmount)` called by executor for accounting. `withdrawToTreasury(token, amount)` sends tokens held by the FeeManager contract to treasury (owner-only). Fees from swaps are sent directly to treasury by the router; FeeManager does not receive those tokens. |
| **ReferralRegistry** | One-time referrer binding per user; no self-referral; `creditReward(referrer, token, amount)`; `claimRewards(token, to)`. |
| **WalletAuthorization** | EIP-712 delegate authorization and revoke; nonce-based replay protection. |

### Vault (ERC-4626)

| Contract | Role |
|----------|------|
| **Vault** | ERC-4626; deposit cap; optional withdrawal fee; performance fee on profit only; strategy integration; pause. |
| **BaseStrategy** | Abstract; only vault may call deposit/withdraw; strategies implement harvest(), balanceOf(). |
| **UniswapV3LPStrategy** | Single Uniswap V3 position; deposit/withdraw/harvest; balanceOf() uses pool sqrtPriceX96. |
| **VaultFactory** | createVault, createVaultWithStrategy, registerVault. |
| **UniswapV3VaultFactory** | Deploys vault + Uniswap V3 LP strategy in one tx. |

See `contracts/vault/README.md` for harvest flow, fee caps, and deployment.

### Strategy tokenization and marketplace

| Contract | Role |
|----------|------|
| **StrategyNFT** | ERC721 + ERC2981; minted on strategy register; stores strategy address, creator, version, metadata URI. |
| **StrategyRegistry** | Registers strategy (type, risk level, performance hash, metadata); mints NFT to creator; only creator can upgrade version. |
| **StrategySubscriptionManager** | Pay in ERC20 to subscribe by duration; subscription required for execution when using strategy binding. |
| **RoyaltyDistributor** | Splits revenue (creator, protocol, optional affiliate); claimable per (account, token). |
| **StrategyMarketplace** | List/buy Strategy NFT at fixed price (ERC20); royalties to RoyaltyDistributor. |
| **ExecutionRouter (binding)** | `executeExactInputSingleWithStrategy(..., strategyTokenId)`: enforces NFT ownership, active subscription, active strategy version. |

### DAO automation

| Contract | Role |
|----------|------|
| **RiskGuard** | Max daily spend (ETH), max slippage (bps), whitelist, pause. `validateExecution(target, spendAmount)`; controller calls `recordSpend` after execution. |
| **PolicyEngine** | Rules (Always, TimestampAfter, IntervalElapsed); execution limits; `triggerRule(ruleId, payload)`. |
| **TreasuryAutomationController** | Owner-only `executeAutomatedSwap` (RiskGuard check, then ExecutionRouter with treasury as beneficiary); `executeVaultHarvest(vault)` for whitelisted vaults. |
| **BuybackModule** | TWAP-style schedules; `executeBuybackChunk(scheduleId, ...)` per chunk. |
| **GovernanceExecutorAdapter** | Single executor; `execute(target, value, data)` only by executor (e.g. Timelock). |

Agent registry, staking, revenue, and subscriptions are documented under `contracts/`.

---

## Execution engine (private RPC and MEV protection)

The execution engine is a Node.js service that accepts signed transactions, enqueues to Redis, then runs simulation, MEV guard, gas handling, and broadcast. It does not hold private keys.

- **Private RPC**: HTTP server; accepts `eth_sendRawTransaction` and `vacuum_execute` (EIP-712); validates API key and nonce; enqueues to Redis.
- **Worker**: Dequeues tx; simulates with eth_call/estimateGas; runs MEV guard (risk score, action: safe / increaseGas / bundle / reject); applies gas manager; broadcasts (optional private relay, fallback to public RPC).
- **Mempool listener**: WebSocket subscription to pending txs; decodes Uniswap V3 (and Camelot-style) swaps; maintains snapshot in Redis for MEV evaluation.
- **Bundler**: Sequential broadcast of multiple txs (order preserved).

Run: Redis required; then `cd execution-engine && npm install && cp .env.example .env && npm run build && npm start`. RPC at `http://localhost:8545`; health at `GET /health`; metrics at `GET /metrics`. See `execution-engine/README.md` for architecture, MEV logic, and configuration.

---

## SDK (vacuum-sdk)

TypeScript client for execution, vaults, strategies, DAO, and agents. Works in Node and browser; peer dependency ethers ^6.0.0.

- **execution**: swapExactInputSingle, getQuote, simulateSwap, approveToken, estimateSwapGas; optional slippage helper.
- **vaults**: deposit, withdraw, redeem, previewDeposit/Withdraw, getVaultInfo, getUserPosition.
- **strategies**: registerStrategy, subscribe, cancelSubscription, listMarketplace, buyStrategy, claimRoyalty.
- **dao**: getPolicyStatus, canExecute, triggerRule, getTreasuryExposure, getBuybackSchedules.
- **agents**: registerAgent, stakeAgent, subscribeToAgent, claimAgentRevenue, getAgentMetadata.

Install: `npm install vacuum-sdk ethers`. Default addresses target Arbitrum Sepolia; override via `addresses` for other networks. See `packages/sdk/README.md` and `packages/sdk/API.md`.

---

## Agent package (@vacuum/agent)

Non-custodial agent framework. Agents use the SDK signer and never hold user keys; they respect RiskGuard and PolicyEngine.

- **BaseAgent**: start(), stop(), evaluate(), generateSignal(), submitExecution().
- **StrategyAgent**: Swap signals; subscription check; slippage.
- **VaultAgent**: Harvest/rebalance signals; risk caps.
- **DaoAutomationAgent**: Rule trigger and buyback; policy and RiskGuard validation.

Install: `npm install @vacuum/agent vacuum-sdk ethers`. See `packages/agent/README.md` and `packages/agent/AGENTS.md`.

---

## Frontend

React app (Vite) with wagmi and RainbowKit: swap, vault, strategy (subscribe, list, buy), DAO (RiskGuard, PolicyEngine, treasury controller, buyback, adapter), referral, delegate execution, protocol info (FeeManager balances, withdraw to treasury), and agent/protocol tabs. Includes landing page, docs (overview, SDK, execution engine, run locally), and memo/pitch page. Contract addresses for Arbitrum Sepolia are in `frontend/src/constants.ts`.

Run: `cd frontend && npm install && npm run dev`.

---

## Environment variables

No emojis; list only. Use `.env` in each directory as needed.

### Root / contracts (Hardhat)

Used for deploy, verify, and scripts (e.g. `npm run deploy:sepolia`, `npm run swap:eth-to-usdc`).

| Variable | Description |
|----------|-------------|
| ARBITRUM_SEPOLIA_RPC_URL | RPC for Arbitrum Sepolia (fork and deploy). |
| ARBITRUM_ONE_RPC_URL | RPC for Arbitrum One. |
| PRIVATE_KEY | Deployer or signer key (hex). |
| TREASURY_ADDRESS | Fee recipient for FeeManager (default: deployer). |
| PROTOCOL_FEE_BPS | Protocol fee in basis points (e.g. 50 = 0.5%). |
| REFERRAL_SPLIT_BPS | Referrer share of fee in bps (e.g. 5000 = 50%). |
| ARBISCAN_API_KEY | Arbiscan API key for verification. |
| ARBISCAN_SEPOLIA_API_KEY | Arbiscan Sepolia API key. |
| FORK_MAINNET | Set to 1 to use Arbitrum One fork for tests/scripts. |
| FORK_BLOCK_NUMBER | Optional pinned block for fork. |
| DEPLOYED_EXECUTION_ROUTER | Set after deploy for swap scripts. |
| DEPLOYED_FEE_MANAGER | For verify script. |
| DEPLOYED_REFERRAL_REGISTRY | For verify script. |
| DEPLOYED_WALLET_AUTH | For verify script. |
| EXECUTION_ROUTER_ADDRESS | Used when deploying TreasuryAutomationController. |
| PROTOCOL_TREASURY | Used when deploying agent revenue/distributor. |
| STAKING_TOKEN | Optional; for AgentStaking deployment. |

### Execution engine (`execution-engine/.env`)

| Variable | Description |
|----------|-------------|
| RPC_URL | Arbitrum JSON-RPC for broadcast and simulation. |
| RPC_WS_URL | WebSocket RPC for mempool pending tx subscription. |
| PRIVATE_RELAY_URL | Optional private relay/sequencer for broadcast. |
| REDIS_URL | Redis connection (queue and mempool snapshot). |
| API_KEYS | Comma-separated keys for X-API-Key on POST /rpc. |
| CHAIN_ID | 42161 (Arbitrum One) or 421614 (Arbitrum Sepolia). |
| MAX_GAS_MULTIPLIER | Cap for gas price multiplier. |
| RISK_THRESHOLD | 0–100; above this risk score tx is rejected. |
| MAX_SLIPPAGE_BPS | Max slippage override in bps. |
| MEMPOOL_WINDOW_BLOCKS | Mempool activity window for MEV. |
| QUEUE_NAME | Redis list name for tx queue. |
| PORT | HTTP server port (default 8545). |
| METRICS_ENABLED | Set to true to expose GET /metrics. |
| LOG_LEVEL | debug, info, warn, or error. |
| RUN_MEMPOOL | Set to false to disable mempool listener. |
| RUN_WORKER | Set to false to disable worker (RPC only). |

### Agent package (`packages/agent/.env`)

| Variable | Description |
|----------|-------------|
| RPC_URL | RPC endpoint for SDK. |
| CHAIN_ID | Chain ID (e.g. 421614, 42161). |
| PRIVATE_KEY | Signer key for agent (hex). |
| DRY_RUN | If true, evaluate only; do not submit. |
| LOG_LEVEL | Log level. |
| RULE_ID | Optional; for DAO rule trigger. |
| VAULT_ADDRESS | Optional; for vault agent. |
| STRATEGY_TOKEN_ID | Optional; for strategy agent. |

---

## Build and test

### Contracts

```bash
npm install
npm run compile
```

Unit tests (default: Arbitrum Sepolia fork):

```bash
npm run test:unit
```

Integration tests (Arbitrum One fork, real Uniswap V3):

```bash
FORK_MAINNET=1 npx hardhat test test/integration/ExecutionRouter.fork.test.ts
```

Vault unit/integration:

```bash
npx hardhat test test/unit/Vault.test.ts test/unit/VaultFactory.test.ts
FORK_MAINNET=1 npx hardhat test test/integration/Vault.fork.test.ts
```

Strategy, DAO, and agent tests: see `test/unit/` and the READMEs under `contracts/`.

### Execution engine

```bash
cd execution-engine
npm install
npm run build
npm test
npm start
```

### SDK and agent

From repo root (workspaces) or inside `packages/sdk` / `packages/agent`:

```bash
npm install
npm run build
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Deploy

Arbitrum Sepolia (testnet first):

```bash
# Core (ExecutionRouter, FeeManager, ReferralRegistry, WalletAuth)
npm run deploy:sepolia

# Optional env for deploy
export TREASURY_ADDRESS=0x...
export PROTOCOL_FEE_BPS=50
export REFERRAL_SPLIT_BPS=5000
```

Vault, strategy, DAO, and agent deployments: see `contracts/vault/README.md` and the other READMEs under `contracts/` for script order.

Verify on Arbiscan (set deployed addresses in env):

```bash
export DEPLOYED_FEE_MANAGER=0x...
export DEPLOYED_REFERRAL_REGISTRY=0x...
export DEPLOYED_WALLET_AUTH=0x...
export DEPLOYED_EXECUTION_ROUTER=0x...
npm run verify
```

---

## Uniswap V3 integration

- **Arbitrum Sepolia**: SwapRouter02 `0x101F443B4d1b059569D643917553c771E1b9663E`, WETH `0x980B62Da83eFf3D4576C647993b0c1D7faf17c73`.
- **Arbitrum One**: SwapRouter02 `0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45`, WETH `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1`.

Production swap execution uses the live Uniswap V3 router on the target chain (no mock routers).

---

## Security

- ReentrancyGuard on execution paths; slippage and deadline required on swaps.
- Pausable and owner emergency controls; no tx.origin; no arbitrary call(); SafeERC20 for token transfers.
- EIP-712 and nonce for delegate auth replay protection.
- Execution engine: no private keys on server; only signed txs; nonce validation and reservation; API key for POST /rpc; rate limit per key.
- Agents: non-custodial; signer stays in wallet/HSM; RiskGuard and PolicyEngine enforced before execution.

---

## Events (indexed for analytics)

- TradeExecuted(user, executor, tokenIn, tokenOut, amountIn, amountOut, feeAmount, referralAmount, executionId)
- FeeCollected(token, from, amount, referralAmount)
- ReferralRegistered(user, referrer)
- ReferralRewardClaimed(referrer, token, amount, to)
- DelegateAuthorized(owner, delegate)
- DelegateRevoked(owner, delegate)

Vault, strategy, DAO, and agent contracts emit additional events; see respective ABIs and READMEs under `contracts/`.
