/**
 * Strategy module: register, subscribe, marketplace, royalty claim.
 */

import { Contract, ethers, type Provider, type Signer } from "ethers";
import { SignerError, ContractError, ValidationError } from "../errors";
import type { RegisterStrategyParams, SubscriptionStatus, ListingInfo } from "../types";
import {
  STRATEGY_REGISTRY_ABI,
  STRATEGY_SUBSCRIPTION_ABI,
  STRATEGY_NFT_ABI,
  STRATEGY_MARKETPLACE_ABI,
  ROYALTY_DISTRIBUTOR_ABI,
} from "../constants/abis";

export interface StrategyConfig {
  provider: Provider;
  signer?: Signer | null;
  strategyRegistry: string;
  strategyNft: string;
  subscriptionManager: string;
  marketplace: string;
  royaltyDistributor: string;
}

export class StrategyModule {
  private readonly provider: Provider;
  private readonly signer: Signer | null;
  private readonly strategyRegistry: string;
  private readonly strategyNft: string;
  private readonly subscriptionManager: string;
  private readonly marketplace: string;
  private readonly royaltyDistributor: string;

  constructor(config: StrategyConfig) {
    this.provider = config.provider;
    this.signer = config.signer ?? null;
    this.strategyRegistry = config.strategyRegistry;
    this.strategyNft = config.strategyNft;
    this.subscriptionManager = config.subscriptionManager;
    this.marketplace = config.marketplace;
    this.royaltyDistributor = config.royaltyDistributor;
  }

  /**
   * Register a strategy (registry owner only).
   */
  async registerStrategy(params: RegisterStrategyParams): Promise<{ tokenId: bigint; txHash: string }> {
    if (!this.signer) throw new SignerError();
    const registry = new Contract(this.strategyRegistry, STRATEGY_REGISTRY_ABI, this.signer);
    try {
      const tx = await registry.register(
        params.strategy,
        params.creator,
        params.strategyType,
        params.riskLevel,
        params.performanceMetricsHash,
        params.metadataURI
      );
      const receipt = await tx.wait();
      const tokenId = await registry.getTokenId(params.strategy);
      return {
        tokenId: BigInt(tokenId.toString()),
        txHash: receipt?.hash ?? tx.hash,
      };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Register strategy failed");
    }
  }

  /**
   * Get strategy token ID by strategy address.
   */
  async getTokenId(strategyAddress: string): Promise<bigint> {
    const registry = new Contract(this.strategyRegistry, STRATEGY_REGISTRY_ABI, this.provider);
    const tokenId = await registry.getTokenId(strategyAddress);
    return BigInt(tokenId.toString());
  }

  /**
   * Subscribe to a strategy (pay with paymentToken). Requires approval.
   */
  async subscribe(
    strategyTokenId: bigint,
    durationSeconds: bigint,
    paymentToken: string,
    amount: bigint
  ): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    const sub = new Contract(this.subscriptionManager, STRATEGY_SUBSCRIPTION_ABI, this.signer);
    try {
      const tx = await sub.subscribe(strategyTokenId, durationSeconds, paymentToken, amount);
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Subscribe failed");
    }
  }

  /**
   * Cancel subscription for a strategy token.
   */
  async cancelSubscription(strategyTokenId: bigint): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    const sub = new Contract(this.subscriptionManager, STRATEGY_SUBSCRIPTION_ABI, this.signer);
    try {
      const tx = await sub.cancel(strategyTokenId);
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Cancel subscription failed");
    }
  }

  /**
   * Get subscription status for user and strategy token.
   */
  async getSubscriptionStatus(user: string, strategyTokenId: bigint): Promise<SubscriptionStatus> {
    const sub = new Contract(this.subscriptionManager, STRATEGY_SUBSCRIPTION_ABI, this.provider);
    const [active, expiry] = await Promise.all([
      sub.isSubscriptionActive(user, strategyTokenId),
      sub.subscriptionExpiry(user, strategyTokenId),
    ]);
    return {
      active,
      expiryTimestamp: BigInt(expiry.toString()),
      strategyTokenId,
    };
  }

  /**
   * Get strategy metadata URI from NFT.
   */
  async getStrategyMetadata(tokenId: bigint): Promise<string> {
    const nft = new Contract(this.strategyNft, STRATEGY_NFT_ABI, this.provider);
    return nft.tokenURI(tokenId);
  }

  /**
   * List strategy NFT on marketplace.
   */
  async listMarketplace(
    tokenId: bigint,
    paymentToken: string,
    price: bigint
  ): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    const market = new Contract(this.marketplace, STRATEGY_MARKETPLACE_ABI, this.signer);
    try {
      const tx = await market.list(tokenId, paymentToken, price);
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "List failed");
    }
  }

  /**
   * Cancel listing.
   */
  async cancelListing(tokenId: bigint): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    const market = new Contract(this.marketplace, STRATEGY_MARKETPLACE_ABI, this.signer);
    try {
      const tx = await market.cancelListing(tokenId);
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Cancel listing failed");
    }
  }

  /**
   * Get listing for a token.
   */
  async getListing(tokenId: bigint): Promise<ListingInfo | null> {
    const market = new Contract(this.marketplace, STRATEGY_MARKETPLACE_ABI, this.provider);
    const [seller, paymentToken, price] = await market.getListing(tokenId);
    if (seller === ethers.ZeroAddress || price === 0n) return null;
    return {
      seller,
      paymentToken,
      price: BigInt(price.toString()),
    };
  }

  /**
   * Buy strategy NFT. Requires payment token approval.
   */
  async buyStrategy(tokenId: bigint, affiliate?: string): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    const market = new Contract(this.marketplace, STRATEGY_MARKETPLACE_ABI, this.signer);
    const aff = affiliate ?? ethers.ZeroAddress;
    try {
      const tx = await market.buy(tokenId, aff);
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Buy failed");
    }
  }

  /**
   * Claim royalty for a token. Requires signer (claimant).
   */
  async claimRoyalty(token: string): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    const dist = new Contract(this.royaltyDistributor, ROYALTY_DISTRIBUTOR_ABI, this.signer);
    try {
      const tx = await dist.claim(token);
      const receipt = await tx.wait();
      return { txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Claim royalty failed");
    }
  }

  /**
   * Get claimable royalty amount for account and token.
   */
  async getClaimableRoyalty(account: string, token: string): Promise<bigint> {
    const dist = new Contract(this.royaltyDistributor, ROYALTY_DISTRIBUTOR_ABI, this.provider);
    const amount = await dist.claimable(account, token);
    return BigInt(amount.toString());
  }

  /** Upgrade strategy: not exposed on current registry ABI; document as future. */
  async upgradeStrategy(_strategy: string, _newMetadataURI: string): Promise<never> {
    throw new ValidationError("Upgrade not implemented in current registry");
  }
}
