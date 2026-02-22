import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function SdkVaults() {
  return (
    <DocPage
      title="Vaults"
      description="ERC-4626 deposit, withdraw, redeem, and vault info."
    >
      <DocBlock title="getVaultInfo">
        <p className="mb-2">Get vault metadata and state (asset, totalAssets, fees, paused, etc.).</p>
        <CodeBlock>{`const info = await client.vaults.getVaultInfo(vaultAddress?);
// info.asset, info.totalAssets, info.totalSupply, info.symbol,
// info.depositCap, info.performanceFeeBps, info.withdrawalFeeBps,
// info.paused, info.strategyActive, info.treasury`}</CodeBlock>
      </DocBlock>

      <DocBlock title="previewDeposit / previewWithdraw">
        <p className="mb-2">Preview shares for a given asset amount, or assets for a given share amount.</p>
        <CodeBlock>{`const shares = await client.vaults.previewDeposit(assets);
const assets = await client.vaults.previewWithdraw(shares);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="getUserPosition">
        <p className="mb-2">Get user's shares, assets, and max deposit/withdraw/redeem.</p>
        <CodeBlock>{`const position = await client.vaults.getUserPosition(userAddress);
// position.shares, position.assets, position.maxDeposit, position.maxWithdraw, position.maxRedeem`}</CodeBlock>
      </DocBlock>

      <DocBlock title="deposit">
        <p className="mb-2">Deposit assets into vault. Requires signer and prior token approval for the vault.</p>
        <CodeBlock>{`const { shares, txHash } = await client.vaults.deposit(
  assets,
  receiver,
  vaultAddress?
);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="withdraw / redeem">
        <p className="mb-2">Withdraw by asset amount or redeem shares for assets.</p>
        <CodeBlock>{`const { shares, txHash } = await client.vaults.withdraw(assets, receiver, owner, vaultAddress?);
const { assets: out, txHash } = await client.vaults.redeem(shares, receiver, owner, vaultAddress?);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="getAssetAllowance">
        <p className="mb-2">Check asset allowance for the vault (useful before deposit).</p>
        <CodeBlock>{`const allowance = await client.vaults.getAssetAllowance(owner, vaultAddress?);`}</CodeBlock>
      </DocBlock>
    </DocPage>
  );
}
