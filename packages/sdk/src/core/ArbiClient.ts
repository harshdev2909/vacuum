/**
 * ArbiClient — main entry point for the Vacuum SDK.
 * Exposes execution, vaults, strategies, dao, and agents modules.
 */

import { JsonRpcProvider, type Provider, type Signer } from "ethers";
import { ExecutionModule } from "../execution/ExecutionModule";
import { VaultModule } from "../vaults/VaultModule";
import { StrategyModule } from "../strategy/StrategyModule";
import { DaoModule } from "../dao/DaoModule";
import { AgentsModule } from "../agents/AgentsModule";
import { DEFAULT_ADDRESSES, type AddressConfig } from "../constants/addresses";

export interface ArbiClientConfig {
  /** RPC URL for the chain (e.g. Arbitrum Sepolia or Arbitrum One). */
  rpcUrl: string;
  /** Chain ID (e.g. 421614 for Arbitrum Sepolia, 42161 for Arbitrum One). */
  chainId: number;
  /** Optional signer (Wallet or JsonRpcSigner) for sending transactions. */
  signer?: Signer | null;
  /** Optional custom contract addresses; omitted keys use defaults (Arbitrum Sepolia). */
  addresses?: AddressConfig;
}

/**
 * Main SDK client. Use this to access execution, vaults, strategies, DAO, and agents.
 *
 * @example
 * ```ts
 * import { ArbiClient } from "vacuum-sdk";
 * import { JsonRpcProvider } from "ethers";
 *
 * const provider = new JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
 * const client = new ArbiClient({
 *   rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
 *   chainId: 421614,
 *   signer: wallet, // optional
 * });
 * const quote = await client.execution.getQuote({ ... });
 * ```
 */
export class ArbiClient {
  /** Execution (swap, quote, approve, simulate). */
  public readonly execution: ExecutionModule;
  /** Vaults (deposit, withdraw, preview, vault info). */
  public readonly vaults: VaultModule;
  /** Strategies (register, subscribe, marketplace, royalty). */
  public readonly strategies: StrategyModule;
  /** DAO (RiskGuard, PolicyEngine, treasury, buyback, governance). */
  public readonly dao: DaoModule;
  /** Agents (register, stake, subscribe, claim revenue). */
  public readonly agents: AgentsModule;

  private readonly _provider: Provider;
  private readonly _signer: Signer | null;
  private readonly _chainId: number;
  private readonly _addresses: typeof DEFAULT_ADDRESSES;

  constructor(config: ArbiClientConfig) {
    this._chainId = config.chainId;
    this._addresses = { ...DEFAULT_ADDRESSES, ...config.addresses };
    this._provider =
      config.signer?.provider ?? new JsonRpcProvider(config.rpcUrl);
    this._signer = config.signer ?? null;

    this.execution = new ExecutionModule({
      provider: this._provider,
      signer: this._signer,
      routerAddress: this._addresses.executionRouter,
      addresses: this._addresses,
    });

    this.vaults = new VaultModule({
      provider: this._provider,
      signer: this._signer,
      defaultVaultAddress: this._addresses.vault,
    });

    this.strategies = new StrategyModule({
      provider: this._provider,
      signer: this._signer,
      strategyRegistry: this._addresses.strategyRegistry,
      strategyNft: this._addresses.strategyNft,
      subscriptionManager: this._addresses.strategySubscriptionManager,
      marketplace: this._addresses.strategyMarketplace,
      royaltyDistributor: this._addresses.royaltyDistributor,
    });

    this.dao = new DaoModule({
      provider: this._provider,
      signer: this._signer,
      riskGuard: this._addresses.riskGuard,
      policyEngine: this._addresses.policyEngine,
      treasuryController: this._addresses.treasuryAutomationController,
      buybackModule: this._addresses.buybackModule,
      governanceAdapter: this._addresses.governanceExecutorAdapter,
    });

    this.agents = new AgentsModule({
      provider: this._provider,
      signer: this._signer,
      agentRegistry: this._addresses.agentRegistry,
      agentRevenueDistributor: this._addresses.agentRevenueDistributor,
      agentSubscriptionManager: this._addresses.agentSubscriptionManager,
      agentStaking: undefined,
    });
  }

  /** Current chain ID. */
  get chainId(): number {
    return this._chainId;
  }

  /** Provider (read-only). */
  get provider(): Provider {
    return this._provider;
  }

  /** Signer if configured. */
  get signer(): Signer | null {
    return this._signer;
  }

  /** Contract addresses in use. */
  get addresses(): Readonly<typeof DEFAULT_ADDRESSES> {
    return this._addresses;
  }
}
