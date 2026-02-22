/**
 * Example: Deposit USDC into the default vault (Arbitrum Sepolia).
 *
 * Usage:
 *   PRIVATE_KEY=0x... npx ts-node examples/deposit.ts
 *
 * Approve the vault for the deposit amount first (e.g. via SDK vaults.getAssetAllowance / execution.approveToken with vault as spender).
 */

import { ArbiClient } from "../src";
import { JsonRpcProvider, Wallet } from "ethers";

const RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const CHAIN_ID = 421614;
const AMOUNT_USDC = "100"; // 100 USDC (6 decimals)

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error("Set PRIVATE_KEY");
    process.exit(1);
  }

  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(pk, provider);
  const client = new ArbiClient({
    rpcUrl: RPC,
    chainId: CHAIN_ID,
    signer: wallet,
  });

  const amount = BigInt(Math.floor(parseFloat(AMOUNT_USDC) * 1e6));

  const info = await client.vaults.getVaultInfo();
  console.log("Vault:", info.address);
  console.log("Asset:", info.asset);
  console.log("Total assets:", info.totalAssets.toString());

  const previewShares = await client.vaults.previewDeposit(amount);
  console.log("Preview shares for deposit:", previewShares.toString());

  const allowance = await client.vaults.getAssetAllowance(wallet.address);
  if (allowance < amount) {
    console.log("Insufficient allowance. Approve vault for asset first.");
    const { txHash } = await client.execution.approveToken(info.asset, amount, info.address);
    console.log("Approval txHash:", txHash);
  }

  const { shares, txHash } = await client.vaults.deposit(amount, wallet.address);
  console.log("Deposit txHash:", txHash);
  console.log("Shares received:", shares.toString());

  const position = await client.vaults.getUserPosition(wallet.address);
  console.log("Position shares:", position.shares.toString());
  console.log("Position assets:", position.assets.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
