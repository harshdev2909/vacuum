# Vacuum Agent Framework

Non-custodial agent layer for the Vacuum protocol. Agents **do not hold user private keys**. They generate signals, sign structured messages (EIP-712), and submit execution through the SDK, respecting **RiskGuard** and **PolicyEngine**.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Trigger        │     │  Agent           │     │  SDK + Contracts│
│  (cron/webhook/ │────▶│  evaluate()      │────▶│  execution      │
│   rule)         │     │  generateSignal()│     │  dao.triggerRule│
└─────────────────┘     │  submitExecution()│     │  vault harvest  │
                        └──────────────────┘     └─────────────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │ RiskEvaluator    │
                        │ PolicyValidator  │
                        │ ExecutionSigner  │
                        └──────────────────┘
```

- **BaseAgent**: Abstract class with `start()`, `stop()`, `evaluate()`, `generateSignal()`, `submitExecution()`.
- **StrategyAgent**: Swap signals; checks subscription validity; enforces slippage.
- **VaultAgent**: Harvest / rebalance signals; enforces risk caps.
- **DaoAutomationAgent**: Rule trigger and buyback; validates policy and RiskGuard before submit.

## Security model

1. **No key custody** — The agent uses the SDK client’s signer (wallet). Keys stay in the wallet or HSM.
2. **Delegated authorization** — Use WalletAuth EIP-712 so a delegate can execute on behalf of an owner.
3. **RiskGuard** — Every execution is gated by `canExecute(target, spendAmount)` and pause state.
4. **PolicyEngine** — Rule-based triggers use `evaluateCondition(ruleId)` before `triggerRule`.
5. **Simulation** — Prefer SDK `simulateSwap` / staticCall before sending transactions.
6. **Dry-run** — Set `dryRun: true` to evaluate and log without submitting.

## Flow

1. **Trigger**: Cron, webhook, or rule-based event starts an evaluation.
2. **Evaluate**: Agent runs `generateSignal()`. If no signal, exit.
3. **Risk**: `RiskEvaluator.evaluate(spendAmount)` and, for DAO, `PolicyValidator.validateRule(ruleId)`.
4. **Sign**: For delegated execution, `ExecutionSigner.signTypedData()` (EIP-712).
5. **Submit**: Call SDK (e.g. `client.execution.swapExactInputSingle` or `client.dao.triggerRule`).

## Best practices

- Run agents in a restricted process; use env vars for RPC and signer (never commit keys).
- Use **dry-run** in staging; enable submit only in production with proper monitoring.
- Log signals and risk results for audit; consider Prometheus metrics for spend and failure counts.
- Set **deadlines** and **slippage** on swaps; respect RiskGuard daily limits.

## Example: Simple buyback bot

See `examples/SimpleBuybackBot.ts`. It uses `DaoAutomationAgent`, validates the rule, checks RiskGuard, then calls `client.dao.triggerRule(ruleId, payload)`.

## Deployment

- **Dockerfile**: Builds Node app that runs an agent entrypoint (see `Dockerfile`).
- **Env**: `RPC_URL`, `CHAIN_ID`, `PRIVATE_KEY` (or use remote signer), `DRY_RUN`, optional `LOG_LEVEL`.

## Observability

- **Structured logging**: Pass a custom `logger` in `AgentConfig` (e.g. Winston, Pino).
- **Metrics**: Export counters for signals generated, executions submitted, and risk denials (Prometheus-ready).
- **Alerts**: Hook `logger.error` to your alerting when submissions fail or risk is denied.
