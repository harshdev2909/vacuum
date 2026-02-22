# @vacuum/agent

Non-custodial agent framework for the Vacuum protocol. Agents generate signals, sign execution (EIP-712), and submit via the SDK. They **never hold user private keys**; they use the SDK client’s signer and respect **RiskGuard** and **PolicyEngine**.

## Installation

```bash
npm install @vacuum/agent vacuum-sdk ethers
```

## Quick start

```ts
import { ArbiClient } from "vacuum-sdk";
import { StrategyAgent } from "@vacuum/agent";
import { JsonRpcProvider, Wallet } from "ethers";

const client = new ArbiClient({
  rpcUrl: process.env.RPC_URL!,
  chainId: Number(process.env.CHAIN_ID),
  signer: new Wallet(process.env.PRIVATE_KEY!, new JsonRpcProvider(process.env.RPC_URL)),
});

const agent = new StrategyAgent({
  client,
  dryRun: true,
  maxSlippageBps: 50,
});

const result = await agent.evaluate();
```

## Components

- **BaseAgent** — Abstract base: `start()`, `stop()`, `evaluate()`, `generateSignal()`, `submitExecution()`.
- **StrategyAgent** — Swap signals; subscription check; slippage.
- **VaultAgent** — Harvest/rebalance signals; risk caps.
- **DaoAutomationAgent** — Rule trigger and buyback; policy + RiskGuard validation.
- **RiskEvaluator** — RiskGuard `canExecute` and pause check.
- **PolicyValidator** — PolicyEngine rule existence and `evaluateCondition`.
- **ExecutionSigner** — EIP-712 sign and hash for delegated execution.

See **AGENTS.md** for architecture, security model, and deployment.

## Examples

- `examples/SimpleMomentumAgent.ts` — Strategy agent (momentum-style).
- `examples/SimpleAPRRebalancer.ts` — Vault agent.
- `examples/SimpleBuybackBot.ts` — DAO buyback/rule trigger.

Run with `PRIVATE_KEY=0x... npx ts-node examples/SimpleBuybackBot.ts`.

## Env

See `.env.example`: `RPC_URL`, `CHAIN_ID`, `PRIVATE_KEY`, `DRY_RUN`, `LOG_LEVEL`, optional `RULE_ID`, `VAULT_ADDRESS`, `STRATEGY_TOKEN_ID`.

## Docker

From repo root: `docker build -f packages/agent/Dockerfile .`
