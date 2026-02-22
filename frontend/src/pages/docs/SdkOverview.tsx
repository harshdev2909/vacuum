import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function SdkOverview() {
  return (
    <DocPage
      title="SDK Overview"
      description="ArbiClient and module structure."
    >
      <DocBlock title="ArbiClient">
        <p className="mb-4">
          The main entry point. It holds a provider and optional signer and exposes five modules.
        </p>
        <CodeBlock>{`const client = new ArbiClient({ rpcUrl, chainId, signer });

client.execution  // swap, quote, simulate, approve
client.vaults     // deposit, withdraw, redeem, preview, vault info
client.strategies // register, subscribe, marketplace, royalty
client.dao        // RiskGuard, PolicyEngine, treasury, buyback
client.agents     // register agent, stake, subscribe, claim revenue`}</CodeBlock>
      </DocBlock>

      <DocBlock title="Getters">
        <ul className="list-disc space-y-1 pl-6 text-zinc-300">
          <li><code>client.chainId</code> — Current chain ID</li>
          <li><code>client.provider</code> — Ethers provider</li>
          <li><code>client.signer</code> — Signer or null</li>
          <li><code>client.addresses</code> — Contract addresses in use</li>
        </ul>
      </DocBlock>

      <DocBlock title="Module summary">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-[#1e1e2e] pb-2 pr-4 text-left text-zinc-400">Module</th>
              <th className="border-b border-[#1e1e2e] pb-2 text-left text-zinc-400">Key methods</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>execution</code></td><td className="border-b border-[#1e1e2e] py-2">getQuote, simulateSwap, swapExactInputSingle, swapExactInputSingleWithSlippage, approveToken</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>vaults</code></td><td className="border-b border-[#1e1e2e] py-2">getVaultInfo, previewDeposit, previewWithdraw, getUserPosition, deposit, withdraw, redeem</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>strategies</code></td><td className="border-b border-[#1e1e2e] py-2">registerStrategy, subscribe, getSubscriptionStatus, listMarketplace, buyStrategy, claimRoyalty</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>dao</code></td><td className="border-b border-[#1e1e2e] py-2">getPolicyStatus, canExecute, createRule, triggerRule, getTreasuryExposure, getBuybackSchedules</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>agents</code></td><td className="border-b border-[#1e1e2e] py-2">registerAgent, getAgentMetadata, stakeAgent, subscribeToAgent, claimAgentRevenue</td></tr>
          </tbody>
        </table>
      </DocBlock>
    </DocPage>
  );
}
