/**
 * Vault module: ERC-4626 deposit, withdraw, preview, and vault info.
 */

import { Contract, type Provider, type Signer } from "ethers";
import { SignerError, ContractError } from "../errors";
import type { VaultInfo, UserPosition } from "../types";
import { VAULT_ABI, ERC20_ABI } from "../constants/abis";

export interface VaultConfig {
  provider: Provider;
  signer?: Signer | null;
  defaultVaultAddress?: string;
}

export class VaultModule {
  private readonly provider: Provider;
  private readonly signer: Signer | null;
  private readonly defaultVault: string | null;

  constructor(config: VaultConfig) {
    this.provider = config.provider;
    this.signer = config.signer ?? null;
    this.defaultVault = config.defaultVaultAddress ?? null;
  }

  private vaultAddress(override?: string): string {
    const addr = override ?? this.defaultVault;
    if (!addr) throw new Error("Vault address required (pass as argument or set defaultVaultAddress)");
    return addr;
  }

  private getVault(address: string, withSigner = false): Contract {
    const signerOrProvider = withSigner && this.signer ? this.signer : this.provider;
    return new Contract(address, VAULT_ABI, signerOrProvider);
  }

  /**
   * Get vault metadata and state.
   */
  async getVaultInfo(vaultAddress?: string): Promise<VaultInfo> {
    const addr = this.vaultAddress(vaultAddress);
    const vault = this.getVault(addr);
    const [
      asset,
      totalAssets,
      totalSupply,
      symbol,
      depositCap,
      performanceFeeBps,
      withdrawalFeeBps,
      paused,
      strategyActive,
      treasury,
    ] = await Promise.all([
      vault.asset(),
      vault.totalAssets(),
      vault.totalSupply(),
      vault.symbol(),
      vault.depositCap(),
      vault.performanceFeeBps(),
      vault.withdrawalFeeBps(),
      vault.paused(),
      vault.strategyActive(),
      vault.treasury(),
    ]);
    return {
      address: addr,
      asset,
      totalAssets: BigInt(totalAssets.toString()),
      totalSupply: BigInt(totalSupply.toString()),
      symbol,
      depositCap: BigInt(depositCap.toString()),
      performanceFeeBps: BigInt(performanceFeeBps.toString()),
      withdrawalFeeBps: BigInt(withdrawalFeeBps.toString()),
      paused,
      strategyActive,
      treasury,
    };
  }

  /**
   * Preview deposit: how many shares for a given asset amount.
   */
  async previewDeposit(assets: bigint, vaultAddress?: string): Promise<bigint> {
    const addr = this.vaultAddress(vaultAddress);
    const vault = this.getVault(addr);
    const shares = await vault.convertToShares(assets);
    return BigInt(shares.toString());
  }

  /**
   * Preview withdraw: how many assets for a given share amount.
   */
  async previewWithdraw(shares: bigint, vaultAddress?: string): Promise<bigint> {
    const addr = this.vaultAddress(vaultAddress);
    const vault = this.getVault(addr);
    const assets = await vault.convertToAssets(shares);
    return BigInt(assets.toString());
  }

  /**
   * Get user position (shares, assets, max deposit/withdraw/redeem).
   */
  async getUserPosition(userAddress: string, vaultAddress?: string): Promise<UserPosition> {
    const addr = this.vaultAddress(vaultAddress);
    const vault = this.getVault(addr);
    const [shares, maxDeposit, maxWithdraw, maxRedeem] = await Promise.all([
      vault.balanceOf(userAddress),
      vault.maxDeposit(userAddress),
      vault.maxWithdraw(userAddress),
      vault.maxRedeem(userAddress),
    ]);
    const assets = await vault.convertToAssets(shares);
    return {
      vaultAddress: addr,
      shares: BigInt(shares.toString()),
      assets: BigInt(assets.toString()),
      maxDeposit: BigInt(maxDeposit.toString()),
      maxWithdraw: BigInt(maxWithdraw.toString()),
      maxRedeem: BigInt(maxRedeem.toString()),
    };
  }

  /**
   * Deposit assets into vault. Requires signer and prior token approval.
   */
  async deposit(
    assets: bigint,
    receiver: string,
    vaultAddress?: string
  ): Promise<{ shares: bigint; txHash: string }> {
    if (!this.signer) throw new SignerError();
    const addr = this.vaultAddress(vaultAddress);
    const vault = this.getVault(addr, true);
    try {
      const tx = await vault.deposit(assets, receiver);
      const receipt = await tx.wait();
      const shares = await vault.convertToShares(assets);
      return {
        shares: BigInt(shares.toString()),
        txHash: receipt?.hash ?? tx.hash,
      };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Deposit failed");
    }
  }

  /**
   * Withdraw assets from vault (by asset amount). Requires signer.
   */
  async withdraw(
    assets: bigint,
    receiver: string,
    owner: string,
    vaultAddress?: string
  ): Promise<{ shares: bigint; txHash: string }> {
    if (!this.signer) throw new SignerError();
    const addr = this.vaultAddress(vaultAddress);
    const vault = this.getVault(addr, true);
    try {
      const tx = await vault.withdraw(assets, receiver, owner);
      const receipt = await tx.wait();
      const shares = await vault.convertToShares(assets);
      return {
        shares: BigInt(shares.toString()),
        txHash: receipt?.hash ?? tx.hash,
      };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Withdraw failed");
    }
  }

  /**
   * Redeem shares for assets. Requires signer.
   */
  async redeem(
    shares: bigint,
    receiver: string,
    owner: string,
    vaultAddress?: string
  ): Promise<{ assets: bigint; txHash: string }> {
    if (!this.signer) throw new SignerError();
    const addr = this.vaultAddress(vaultAddress);
    const vault = this.getVault(addr, true);
    try {
      const tx = await vault.redeem(shares, receiver, owner);
      const receipt = await tx.wait();
      const assets = await vault.convertToAssets(shares);
      return {
        assets: BigInt(assets.toString()),
        txHash: receipt?.hash ?? tx.hash,
      };
    } catch (err) {
      throw new ContractError(err instanceof Error ? err.message : "Redeem failed");
    }
  }

  /**
   * Check asset allowance for vault (for deposit). Useful before deposit.
   */
  async getAssetAllowance(owner: string, vaultAddress?: string): Promise<bigint> {
    const addr = this.vaultAddress(vaultAddress);
    const vault = this.getVault(addr);
    const asset = await vault.asset();
    const token = new Contract(asset, ERC20_ABI, this.provider);
    const allowance = await token.allowance(owner, addr);
    return BigInt(allowance.toString());
  }
}
