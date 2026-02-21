# Phase 1: Auto-Compounding Vault System

Production-grade ERC-4626 vault system on Arbitrum with pluggable strategies, performance fees, and harvest flow.

## Overview

- **Vault** – ERC-4626 compliant, deposit cap, optional withdrawal fee, performance fee (on profit only), strategy integration.
- **BaseStrategy** – Abstract base; only the vault can call `deposit`/`withdraw`; strategies report `balanceOf()` and implement `harvest()`.
- **UniswapV3LPStrategy** – Real DEX integration: provides liquidity to a Uniswap V3 pool (e.g. USDC/WETH), harvests fees, swaps to underlying, reinvests.
- **VaultFactory** – Deploys vaults (with or without a pre-deployed strategy). Tracks vaults and supports `registerVault` for externally created vaults.
- **UniswapV3VaultFactory** – Deploys vault + Uniswap V3 LP strategy in one tx and optionally registers the vault with a `VaultFactory`.

## Layout

```
contracts/
├── vault/
│   ├── Vault.sol           # ERC-4626 vault, fees, strategy
│   └── VaultConstants.sol  # BPS limits
├── strategy/
│   ├── IBaseStrategy.sol
│   ├── BaseStrategy.sol    # onlyVault, pull on deposit
│   ├── UniswapV3LPStrategy.sol  # Real Uniswap V3 LP
│   ├── MockStrategy.sol    # Tests
│   └── ...
├── factory/
│   ├── VaultFactory.sol    # createVault, createVaultWithStrategy, registerVault
│   └── UniswapV3VaultFactory.sol  # createVaultWithUniswapV3Strategy
└── test/
    └── MockStrategyWithHarvest.sol  # Simulates profit in harvest for tests
```

## Vault

- **totalAssets()** = vault asset balance + `strategy.balanceOf()` when a strategy is active.
- **Deposit**: User approves and calls `deposit(assets, receiver)`. Vault mints shares, pulls assets, then sends assets to strategy and calls `strategy.deposit(assets)`.
- **Withdraw / Redeem**: Vault pulls from strategy if needed, applies optional withdrawal fee to treasury, burns shares, sends assets to receiver.
- **Deposit cap**: Enforced in `maxDeposit()` and `_deposit`; excess reverts.
- **Performance fee**: Only on profit. After `harvest()`, profit = `totalAssets() - lastTotalAssetsForFee`. Fee = `profit * performanceFeeBps / 10000`, taken from strategy to treasury. `lastTotalAssetsForFee` is updated after each harvest.
- **Pause**: Owner can `pause()` / `unpause()`; deposit/withdraw/redeem/harvest are blocked when paused.
- **Strategy upgrade**: Owner calls `retireStrategyAndSetNew(newStrategy)`. Current strategy withdraws all; if `newStrategy` is set and its `vault()` is this vault, vault deposits its balance into the new strategy.
- **Emergency**: Owner can `emergencyWithdrawFromStrategy()` to pull all funds from the strategy into the vault (no new strategy set).

## Strategy

- **BaseStrategy**: `deposit(amount)` pulls `amount` from vault via `transferFrom`, then `_deposit(amount)`. `withdraw(amount)` returns `_withdraw(amount)` and sends that amount to vault. `harvest()` is callable by anyone; `retireStrategy()` and `emergencyWithdraw()` only by vault.
- **UniswapV3LPStrategy**: Asset (e.g. USDC) + paired token (e.g. WETH) are used in a single Uniswap V3 position (tick range). `_deposit`: swap half of asset to paired token, add liquidity (mint or increase). `_withdraw`: decrease liquidity, collect, swap to asset, return up to `amount`. `_harvest`: collect fees, swap to asset, profit = increase in strategy balance. `balanceOf()` = idle asset + position value (using pool `sqrtPriceX96` and LiquidityAmounts). Slippage and reentrancy protected.

## Fee Model

- **Performance fee**: Capped by `VaultConstants.MAX_PERFORMANCE_FEE_BPS` (20%). Set at deploy; owner can update within cap.
- **Withdrawal fee**: Optional; capped by `MAX_WITHDRAWAL_FEE_BPS` (5%). Sent to treasury.
- **Treasury**: Set at deploy; owner can update.

## Harvest Flow

1. Anyone calls `vault.harvest()`.
2. Vault calls `strategy.harvest()` (e.g. collect fees, swap to underlying).
3. Vault computes `profit = totalAssets() - lastTotalAssetsForFee` (or 0 if no increase).
4. Takes performance fee from profit, withdraws fee from strategy, sends to treasury.
5. Updates `lastTotalAssetsForFee = totalAssets()`.
6. Emits `Harvest(profit, feeAmount, reinvested)`.

## Deployment

1. Deploy **VaultFactory** (owner = deployer).
2. **Option A – Vault only**: `factory.createVault(asset, name, symbol, treasury, depositCap, performanceFeeBps, withdrawalFeeBps)`. Then deploy a strategy (e.g. `UniswapV3LPStrategy(vaultAddress, asset, positionManager, swapRouter, pool, tickLower, tickUpper)`) and call `vault.setStrategy(strategy)` (owner).
3. **Option B – Vault + Uniswap V3 strategy**: Deploy **UniswapV3VaultFactory(VaultFactory)**. Then `uniswapV3Factory.createVaultWithUniswapV3Strategy(..., positionManager, swapRouter, pool, tickLower, tickUpper)`. Optionally call `vaultFactory.registerVault(vault)` so the vault appears in `factory.getVaultAt(...)`.

Script (Arbitrum One with USDC):

```bash
npx hardhat run scripts/deploy-vault.ts --network arbitrum-one
# With vault + Uniswap V3 strategy:
CREATE_VAULT_WITH_STRATEGY=1 npx hardhat run scripts/deploy-vault.ts --network arbitrum-one
```

Addresses (see `scripts/constants.ts`):

- **Arbitrum One**: USDC, WETH, NonfungiblePositionManager, SwapRouter02, USDC/WETH 0.3% pool.
- **Arbitrum Sepolia**: WETH, NonfungiblePositionManager, SwapRouter02 (no USDC in constants; use test token or add).

## Tests

- **Unit** (no fork): `test/unit/Vault.test.ts`, `test/unit/VaultFactory.test.ts`. Use MockStrategy / MockStrategyWithHarvest and TestERC20.
- **Integration** (fork): `FORK_MAINNET=1 npx hardhat test test/integration/Vault.fork.test.ts`. Uses Arbitrum One fork, real USDC, deposit/withdraw/harvest.

```bash
npx hardhat test test/unit/Vault.test.ts test/unit/VaultFactory.test.ts
FORK_MAINNET=1 npx hardhat test test/integration/Vault.fork.test.ts
```

## Security

- Only the vault can call strategy `deposit`, `withdraw`, `retireStrategy`, `emergencyWithdraw`.
- ReentrancyGuard on vault and strategy.
- Pausable for deposit/withdraw/harvest.
- Performance fee only on profit; fees capped.
- Strategy upgrade: full withdraw from old strategy before setting new one; slippage protection on swaps in UniswapV3LPStrategy.
