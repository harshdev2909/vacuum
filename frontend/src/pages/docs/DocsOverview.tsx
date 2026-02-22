import { Link } from "react-router-dom";
import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function DocsOverview() {
  return (
    <DocPage
      title="Vacuum SDK"
      description="TypeScript SDK for execution, vaults, strategies, DAO automation, and agents on Arbitrum."
    >
      <DocBlock title="Overview">
        <p className="mb-4">
          The <code>vacuum-sdk</code> package provides a typed, modular interface to the Vacuum protocol on Arbitrum.
          It supports Node.js and browser environments and is built with <strong>ethers v6</strong>.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-zinc-300">
          <li><strong>Execution</strong> — Swap (exact-input single), quote, simulate, approve, gas estimation</li>
          <li><strong>Vaults</strong> — Deposit, withdraw, redeem, preview, vault info, user position (ERC-4626)</li>
          <li><strong>Strategies</strong> — Register, subscribe, cancel, marketplace list/buy, royalty claim</li>
          <li><strong>DAO</strong> — RiskGuard status, PolicyEngine rules, treasury exposure, buyback schedules</li>
          <li><strong>Agents</strong> — Register, stake, subscribe, claim revenue, metadata</li>
        </ul>
      </DocBlock>

      <DocBlock title="Installation">
        <CodeBlock>{`npm install vacuum-sdk ethers
# or
yarn add vacuum-sdk ethers`}</CodeBlock>
        <p className="mt-4 text-sm text-zinc-500">Peer dependency: <code>ethers</code> ^6.0.0</p>
      </DocBlock>

      <DocBlock title="Quick start">
        <CodeBlock>{`import { ArbiClient } from "vacuum-sdk";
import { JsonRpcProvider, Wallet } from "ethers";

const provider = new JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

const client = new ArbiClient({
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  chainId: 421614,
  signer: wallet,
});

// Read-only
const vaultInfo = await client.vaults.getVaultInfo();
const quote = await client.execution.getQuote({ ... });

// With signer: swap
const { txHash } = await client.execution.swapExactInputSingleWithSlippage({
  exactInputSingle: { ... },
  deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
  beneficiary: wallet.address,
  slippageBps: 50,
});`}</CodeBlock>
      </DocBlock>

      <DocBlock title="Next steps">
        <ul className="space-y-2 text-zinc-300">
          <li><Link to="/docs/getting-started" className="text-[#22d3ee] hover:underline">Getting started</Link> — Configuration and first swap</li>
          <li><Link to="/docs/sdk/overview" className="text-[#22d3ee] hover:underline">SDK Overview</Link> — ArbiClient and modules</li>
          <li><Link to="/docs/guides/examples" className="text-[#22d3ee] hover:underline">Examples</Link> — Swap, deposit, DAO, agents</li>
          <li><Link to="/docs/contract-to-contract" className="text-[#22d3ee] hover:underline">Contract-to-contract calls</Link> — How protocol contracts call each other</li>
          <li><Link to="/docs/execution-engine" className="text-[#22d3ee] hover:underline">Execution Engine</Link> — Private RPC + MEV protection, simulation, bundling</li>
          <li><Link to="/docs/run-locally" className="text-[#22d3ee] hover:underline">Run everything locally</Link> — Redis, Execution Engine, frontend, SDK, agents (step-by-step)</li>
        </ul>
      </DocBlock>
    </DocPage>
  );
}
