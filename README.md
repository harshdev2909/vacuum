# arbi-execution-layer

Production-grade Arbitrum-native trading execution layer. Executes swaps via **live Uniswap V3** (SwapRouter02) on Arbitrum, with protocol fees, referral rewards, multi-wallet authorization (EIP-712), slippage protection, and emergency controls.

## Stack

- **Solidity** ^0.8.24  
- **Hardhat** + **Ethers v6** + **TypeScript**  
- **OpenZeppelin** contracts  
- **Hardhat Toolbox** + network forking (Arbitrum Sepolia or Arbitrum One)

## Contracts

| Contract | Role |
|----------|------|
| **ExecutionRouter** | Executes swaps via Uniswap V3 (exactInputSingle, exactInput, exactOutputSingle, exactOutput), enforces slippage/deadline, deducts fee, distributes referral, emits `TradeExecuted`. ReentrancyGuard, Pausable, Ownable, nonce replay protection. |
| **FeeManager** | Protocol fee (bps), referral split (bps), max fee cap (2%), treasury address, multi-token fee accounting, `FeeCollected` events, treasury withdrawals. |
| **ReferralRegistry** | One-time referrer binding per user, no self-referral, referral earnings, `claimRewards`. |
| **WalletAuthorization** | EIP-712 delegate authorization and revoke, nonce-based replay protection. |

## Local environment (Uniswap-style)

This project follows the same ideas as [Uniswap’s local environment guide](https://docs.uniswap.org/contracts/v3/guides/local-environment): Hardhat, tests, and a **mainnet fork** so you can test against real Uniswap V3 liquidity without deploying to a live network.

Differences from that guide:

- We target **Arbitrum** (Sepolia testnet or Arbitrum One), not Ethereum mainnet.
- We integrate with Uniswap V3 by calling the **deployed SwapRouter02** at a known address and use our own **IV3SwapRouter** interface. We do **not** add `@uniswap/v3-periphery` or `@uniswap/v3-core` or compile Uniswap’s Solidity (we use Solidity 0.8.24 and OpenZeppelin only).
- Forking is built into Hardhat: the default `hardhat` network is already an Arbitrum Sepolia fork; use `FORK_MAINNET=1` for an Arbitrum One fork. No separate “start a node” step unless you want a long‑lived local node.

Equivalent workflow:

| Uniswap guide | This repo |
|---------------|-----------|
| `npx hardhat compile` | `npm run compile` |
| Local node + mainnet fork | Hardhat’s built‑in fork (see **Tests** below) |
| `npx hardhat test --network localhost` | `npm run test` or `npm run fork:test` (see **Tests**) |

If you run a persistent Hardhat node (e.g. `npm run node:fork`), you can run tests against it with `npx hardhat test --network localhost`.

### Set up local environment and swap

1. **Install and compile**
   ```bash
   npm install
   npm run compile
   ```

2. **Optional: put your wallet in `.env`**
   ```bash
   cp .env.example .env
   # Edit .env and set PRIVATE_KEY=0x...
   ```

3. **Deploy on fork and run a swap (one command)**  
   This uses Hardhat’s in-process Arbitrum Sepolia fork: it deploys `ExecutionRouter` (and dependencies), then swaps ~$1 of ETH → ARB.
   ```bash
   npm run local:swap
   ```
   For an Arbitrum One fork (ETH → USDC): `FORK_MAINNET=1 npm run local:swap`  
   *Note: Some setups hit a Hardhat + Arbitrum fork “hardfork” error. If so, use the testnet flow below.*

4. **Alternative: swap on live testnet (no fork)**  
   With a deployed router on Arbitrum Sepolia (e.g. from `npm run deploy:sepolia`), set `DEPLOYED_EXECUTION_ROUTER` in `.env` and run:
   ```bash
   npm run swap:eth-to-usdc -- --network arbitrum-sepolia
   ```
   (Requires testnet ETH and a pool with liquidity; for mainnet USDC use `--network arbitrum-one` after deploying there.)

4. **Optional: local node + localhost**  
   To use a long-lived node (like the Uniswap guide’s “Local Node with a Mainnet Fork”):
   - Terminal 1: `FORK_MAINNET=1 npm run node:fork` (or `npm run node:fork` for Sepolia fork)
   - Terminal 2: `npx hardhat run scripts/deploy.ts --network localhost`, then set `DEPLOYED_EXECUTION_ROUTER` and run `npm run swap:eth-to-usdc -- --network localhost`

## Setup

```bash
npm install
cp .env.example .env   # optional
```

### Environment (optional)

- `ARBITRUM_SEPOLIA_RPC_URL` – RPC for Arbitrum Sepolia (fork / deploy)
- `ARBITRUM_ONE_RPC_URL` – RPC for Arbitrum One
- `PRIVATE_KEY` – deployer key
- `ARBISCAN_API_KEY` / `ARBISCAN_SEPOLIA_API_KEY` – for contract verification
- `TREASURY_ADDRESS` – fee recipient (default: deployer)
- `PROTOCOL_FEE_BPS` – e.g. 50 (0.5%)
- `REFERRAL_SPLIT_BPS` – e.g. 5000 (50% of fee to referrer)
- `FORK_MAINNET=1` – use Arbitrum One fork for integration tests
- `FORK_BLOCK_NUMBER` – optional pinned block for fork

## Build

```bash
npm run compile
```

## Tests

- **Unit** (mock router or testnet fork): fee math, referral registration, slippage/deadline/pause/nonce/unauthorized.
- **Integration** (real Uniswap V3 on fork): ETH→USDC, USDC→WETH, fee deduction, referral allocation, treasury, slippage revert.

```bash
# Unit tests (default: Arbitrum Sepolia fork)
npm run test:unit
# or explicitly
npx hardhat test test/unit/FeeManager.test.ts test/unit/ReferralRegistry.test.ts test/unit/WalletAuthorization.test.ts test/unit/ExecutionRouter.test.ts

# Integration tests (Arbitrum One fork, real swaps)
FORK_MAINNET=1 npx hardhat test test/integration/ExecutionRouter.fork.test.ts

# All tests
npm run test
```

## Deploy (testnet first)

```bash
# Arbitrum Sepolia
npm run deploy:sepolia

# Optional env for deploy
export TREASURY_ADDRESS=0x...
export PROTOCOL_FEE_BPS=50
export REFERRAL_SPLIT_BPS=5000
```

## Verify on Arbiscan

After deploy, set the addresses (from deploy output) and run:

```bash
export DEPLOYED_FEE_MANAGER=0x...
export DEPLOYED_REFERRAL_REGISTRY=0x...
export DEPLOYED_WALLET_AUTH=0x...
export DEPLOYED_EXECUTION_ROUTER=0x...
# Optional: TREASURY_ADDRESS, PROTOCOL_FEE_BPS, REFERRAL_SPLIT_BPS (must match deploy)
npm run verify
```

## Security

- **ReentrancyGuard** on execution paths.  
- **Slippage** and **deadline** required on all swaps.  
- **Pausable** and **owner** emergency controls.  
- No `tx.origin`, no arbitrary `call()`.  
- **SafeERC20** for all token transfers.  
- **EIP-712** + nonce for delegate auth replay protection.

## Events (indexed for analytics)

- `TradeExecuted(user, executor, tokenIn, tokenOut, amountIn, amountOut, feeAmount, referralAmount, executionId)`  
- `FeeCollected(token, from, amount, referralAmount)`  
- `ReferralRegistered(user, referrer)`  
- `ReferralRewardClaimed(referrer, token, amount, to)`  
- `DelegateAuthorized(owner, delegate)`  
- `DelegateRevoked(owner, delegate)`

## Uniswap V3 integration

- **Arbitrum Sepolia**: SwapRouter02 `0x101F443B4d1b059569D643917553c771E1b9663E`, WETH `0x980B62Da83eFf3D4576C6477b4381A595Fc7B639`.  
- **Arbitrum One**: SwapRouter02 `0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45`, WETH `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1`.

No mock routers in production; all swap execution uses the live Uniswap V3 router on the target chain.
