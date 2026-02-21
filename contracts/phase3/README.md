# Phase 3: Strategy Tokenization & Subscription Infrastructure

Production-grade strategy NFT, registry, subscription, royalties, execution binding, and marketplace.

## Overview

- **StrategyNFT** – ERC721 + ERC2981. Minted when a strategy is registered. Stores strategy address, creator, version, metadata URI. Royalties to creator.
- **StrategyRegistry** – Registers strategy metadata (type, risk level, performance hash). Only creator can upgrade. Maintains version history. Mints NFT on first register.
- **StrategySubscriptionManager** – Pay in ERC20 to subscribe for a duration. Subscription required for execution when using strategy binding. Recurring via extend; cancel allowed.
- **RoyaltyDistributor** – Splits revenue (creator %, protocol %, optional affiliate %). Tracks claimable per (account, token). Claim withdraws.
- **ExecutionRouter (binding)** – Optional `executeExactInputSingleWithStrategy(..., strategyTokenId)`. When `strategyTokenId != 0`: requires caller/owner to own the NFT, have active subscription, and strategy at active version.
- **StrategyMarketplace** – List Strategy NFT at fixed price (ERC20). Buy: pay price, royalties sent to RoyaltyDistributor, remainder to seller, NFT transferred to buyer.

## Layout

```
contracts/
├── strategy/
│   ├── StrategyNFT.sol
│   └── StrategyRegistry.sol
├── royalty/
│   └── RoyaltyDistributor.sol
├── subscription/
│   └── StrategySubscriptionManager.sol
├── marketplace/
│   └── StrategyMarketplace.sol
├── ExecutionRouter.sol   (modified: setStrategyBinding, executeExactInputSingleWithStrategy)
├── interfaces/
│   ├── IStrategyNFT.sol
│   ├── IStrategyRegistry.sol
│   └── IStrategySubscriptionManager.sol
└── libraries/
    └── Phase3Constants.sol
```

## Flow

1. **Register strategy**  
   Owner calls `StrategyRegistry.register(strategy, creator, strategyType, riskLevel, performanceMetricsHash, metadataURI)`. Registry mints a Strategy NFT to `creator` and stores metadata + version 1.

2. **Upgrade**  
   Creator calls `StrategyRegistry.upgradeStrategy(strategy, newVersion, newPerformanceMetricsHash)`. Registry updates active version and version history; calls `StrategyNFT.setVersion(tokenId, newVersion)`.

3. **Subscribe**  
   User calls `StrategySubscriptionManager.subscribe(strategyTokenId, durationSeconds, paymentToken, amount)`. Payment is forwarded to RoyaltyDistributor (split creator/protocol/affiliate). User’s subscription expiry for that token is set (or extended).

4. **Execute with strategy**  
   If ExecutionRouter has strategy binding set, user can call `executeExactInputSingleWithStrategy(..., strategyTokenId)`. Router checks: NFT ownership, active subscription, active version; then runs the same swap logic as `executeExactInputSingle`.

5. **Marketplace**  
   Seller lists with `StrategyMarketplace.list(tokenId, paymentToken, price)` and approves the marketplace for the NFT. Buyer calls `buy(tokenId, affiliate)`: pays price, royalty is sent to RoyaltyDistributor (with optional affiliate), remainder to seller, NFT transferred to buyer.

## Security

- **StrategyNFT**: Mint and setVersion only by registry; registry set once.
- **StrategyRegistry**: Only creator can upgrade; register only by owner.
- **RoyaltyDistributor**: BPS caps (creator/protocol/affiliate); split sum ≤ 10000.
- **Subscription**: One expiry per (user, strategyTokenId); no double subscription in same window (extend or new period).
- **Marketplace**: Listing removed on buy (replay prevented); reentrancy guard.
- **ExecutionRouter**: Binding checks before any swap; optional (strategyTokenId 0 or unset binding skips checks).

## Deployment

1. Deploy **StrategyRegistry** (no constructor args).
2. Deploy **StrategyNFT**(royaltyBps), e.g. 500 = 5%.
3. Call `registry.setStrategyNFT(nft)` and `nft.setRegistry(registry)`.
4. Deploy **RoyaltyDistributor**(protocolTreasury, creatorBps, protocolBps, affiliateBps).
5. Deploy **StrategySubscriptionManager**(nft, royaltyDistributor).
6. Deploy **StrategyMarketplace**(nft, royaltyDistributor).
7. On existing **ExecutionRouter**: call `router.setStrategyBinding(nft, registry, subscriptionManager)`.

```bash
npx hardhat run scripts/deploy-phase3.ts --network arbitrum-sepolia
```

## Tests

- **Unit**: `test/unit/Phase3StrategyNFT.test.ts`, `Phase3StrategyRegistry.test.ts`, `Phase3RoyaltyDistributor.test.ts`, `Phase3Subscription.test.ts`, `Phase3Marketplace.test.ts`, `Phase3ExecutionBinding.test.ts`.
- **Run**: `npx hardhat test test/unit/Phase3StrategyNFT.test.ts test/unit/Phase3StrategyRegistry.test.ts test/unit/Phase3RoyaltyDistributor.test.ts test/unit/Phase3Subscription.test.ts test/unit/Phase3Marketplace.test.ts test/unit/Phase3ExecutionBinding.test.ts`

## Interfaces

- **IStrategyNFT**: mint, setVersion, strategyByToken, versionByToken, creatorByToken, ownerOf, transferFrom, royaltyInfo.
- **IStrategyRegistry**: register, upgradeStrategy, getTokenId, getActiveVersion, isActiveVersion, getCreator.
- **IStrategySubscriptionManager**: subscribe, cancel, isSubscriptionActive, subscriptionExpiry.
