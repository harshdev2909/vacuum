import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function GettingStarted() {
  return (
    <DocPage
      title="Getting started"
      description="Configure the SDK and run your first read and write calls."
    >
      <DocBlock title="Configuration">
        <p className="mb-4">
          Create an <code>ArbiClient</code> with an RPC URL, chain ID, and optionally a signer for transactions.
        </p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-[#1e1e2e] pb-2 pr-4 text-left text-zinc-400">Option</th>
              <th className="border-b border-[#1e1e2e] pb-2 pr-4 text-left text-zinc-400">Type</th>
              <th className="border-b border-[#1e1e2e] pb-2 text-left text-zinc-400">Description</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>rpcUrl</code></td><td className="border-b border-[#1e1e2e] py-2 pr-4">string</td><td className="border-b border-[#1e1e2e] py-2">RPC endpoint (required)</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>chainId</code></td><td className="border-b border-[#1e1e2e] py-2 pr-4">number</td><td className="border-b border-[#1e1e2e] py-2">e.g. 421614 (Sepolia), 42161 (One)</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>signer</code></td><td className="border-b border-[#1e1e2e] py-2 pr-4">Signer</td><td className="border-b border-[#1e1e2e] py-2">Optional; required for write calls</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>addresses</code></td><td className="border-b border-[#1e1e2e] py-2 pr-4">object</td><td className="border-b border-[#1e1e2e] py-2">Override contract addresses</td></tr>
          </tbody>
        </table>
        <CodeBlock>{`const client = new ArbiClient({
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  chainId: 421614,
  signer: wallet, // optional
  addresses: { executionRouter: "0x..." }, // optional overrides
});`}</CodeBlock>
      </DocBlock>

      <DocBlock title="Read-only calls">
        <p className="mb-4">You can query vault info, quotes, and policy status without a signer.</p>
        <CodeBlock>{`const info = await client.vaults.getVaultInfo();
const quote = await client.execution.getQuote({
  exactInputSingle: {
    tokenIn: WETH,
    tokenOut: USDC,
    fee: 500,
    recipient: wallet.address,
    amountIn: BigInt(1e15),
    amountOutMinimum: 0n,
  },
  beneficiary: wallet.address,
});
const policyStatus = await client.dao.getPolicyStatus();`}</CodeBlock>
      </DocBlock>

      <DocBlock title="Writing transactions">
        <p className="mb-4">Swap, deposit, and other state-changing calls require a signer (e.g. ethers Wallet).</p>
        <CodeBlock>{`const { txHash } = await client.execution.swapExactInputSingleWithSlippage({
  exactInputSingle: { tokenIn, tokenOut, fee: 500, recipient, amountIn, amountOutMinimum: 0n },
  deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
  beneficiary: wallet.address,
  slippageBps: 50,
});`}</CodeBlock>
      </DocBlock>
    </DocPage>
  );
}
