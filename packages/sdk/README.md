# vacuum-sdk

TypeScript SDK for the **Vacuum** protocol on Arbitrum: execution (swap), vaults (ERC-4626), strategy NFTs, DAO automation, and agent registry.

## Features

- **Execution** — Swap (exact-input single), quote, simulate, approve, gas estimation
- **Vaults** — Deposit, withdraw, redeem, preview, vault info, user position
- **Strategies** — Register, subscribe, cancel, marketplace list/buy, royalty claim
- **DAO** — RiskGuard status, PolicyEngine rules, treasury exposure, buyback schedules
- **Agents** — Register, stake, subscribe, claim revenue, metadata

Works in **Node.js** and **browser**. Built with **ethers v6**. Strict TypeScript, tree-shakable exports, custom error classes.

## Installation

```bash
npm install vacuum-sdk ethers
# or
yarn add vacuum-sdk ethers
```

**Peer dependency:** `ethers` ^6.0.0.

## Quick start

```ts
import { ArbiClient } from "vacuum-sdk";
import { JsonRpcProvider, Wallet } from "ethers";

const provider = new JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
const wallet = new Wallet(process.env.PRIVATE_KEY!, provider);

const client = new ArbiClient({
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  chainId: 421614,
  signer: wallet,
});

// Read-only (no signer needed for these)
const vaultInfo = await client.vaults.getVaultInfo();
const quote = await client.execution.getQuote({
  exactInputSingle: {
    tokenIn: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73", // WETH
    tokenOut: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4D", // USDC
    fee: 500,
    recipient: wallet.address,
    amountIn: BigInt(1e15), // 0.001 ETH
    amountOutMinimum: 0n,
  },
  beneficiary: wallet.address,
});

// With signer: swap
const { txHash } = await client.execution.swapExactInputSingleWithSlippage({
  exactInputSingle: { ... },
  deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
  beneficiary: wallet.address,
  slippageBps: 50,
});
```

## Configuration

| Option     | Type    | Description                          |
|-----------|--------|--------------------------------------|
| `rpcUrl`  | string | RPC endpoint (required)              |
| `chainId` | number | Chain ID (e.g. 421614, 42161)        |
| `signer`  | Signer | Optional; required for write calls   |
| `addresses` | object | Optional overrides for contract addresses |

Default addresses are for **Arbitrum Sepolia**. Override `addresses` for other networks or custom deployments.

## Modules

- **client.execution** — `swapExactInputSingle`, `getQuote`, `simulateSwap`, `approveToken`, `estimateSwapGas`
- **client.vaults** — `deposit`, `withdraw`, `redeem`, `previewDeposit`, `previewWithdraw`, `getVaultInfo`, `getUserPosition`
- **client.strategies** — `registerStrategy`, `subscribe`, `cancelSubscription`, `getSubscriptionStatus`, `listMarketplace`, `buyStrategy`, `claimRoyalty`
- **client.dao** — `getPolicyStatus`, `canExecute`, `createRule`, `triggerRule`, `getRule`, `getTreasuryExposure`, `getBuybackSchedules`
- **client.agents** — `registerAgent`, `stakeAgent`, `subscribeToAgent`, `claimAgentRevenue`, `getAgentMetadata`, `getAgentPerformance`

See **API.md** for full method signatures, parameters, and return types.

## Error handling

The SDK throws typed errors:

- **VacuumError** — base
- **ContractError** — revert or contract failure (includes `txHash` when available)
- **SignerError** — operation requires a signer
- **ValidationError** — invalid parameter or field
- **SimulationError** — staticCall / simulation failed
- **PolicyError** — RiskGuard or policy blocked execution

```ts
try {
  await client.execution.swapExactInputSingle(params);
} catch (e) {
  if (e instanceof SignerError) {
    console.error("Connect a wallet");
  } else if (e instanceof ContractError) {
    console.error("Tx failed:", e.txHash);
  }
}
```

## Security notes

- Never commit private keys. Use env vars or a secure signer provider.
- For swaps, always use a deadline and minimum amount out (or slippage helper).
- Check RiskGuard / policy status before submitting DAO or automated actions.
- Simulate (e.g. `simulateSwap`) before sending transactions when possible.

## License

MIT
