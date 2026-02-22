import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function GuidesExamples() {
  return (
    <DocPage
      title="Examples"
      description="Code samples for swap, deposit, DAO, and agents."
    >
      <DocBlock title="Swap (ETH → USDC)">
        <CodeBlock>{`import { ArbiClient } from "vacuum-sdk";
import { JsonRpcProvider, Wallet } from "ethers";

const client = new ArbiClient({
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  chainId: 421614,
  signer: wallet,
});

const WETH = "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73";
const USDC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4D";
const amountIn = BigInt(1e15); // 0.001 ETH
const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

const { txHash, amountOut } = await client.execution.swapExactInputSingleWithSlippage({
  exactInputSingle: {
    tokenIn: WETH,
    tokenOut: USDC,
    fee: 500,
    recipient: wallet.address,
    amountIn,
    amountOutMinimum: 0n,
  },
  deadline,
  beneficiary: wallet.address,
  slippageBps: 50,
});`}</CodeBlock>
      </DocBlock>

      <DocBlock title="Vault deposit">
        <CodeBlock>{`const info = await client.vaults.getVaultInfo();
const amount = BigInt(100 * 1e6); // 100 USDC

// Approve vault to spend asset
await client.execution.approveToken(info.asset, amount, info.address);

const { shares, txHash } = await client.vaults.deposit(amount, wallet.address);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="DAO: policy status and trigger rule">
        <CodeBlock>{`const status = await client.dao.getPolicyStatus();
if (status.paused) return;

const allowed = await client.dao.canExecute(controllerAddress, spendAmount);
if (!allowed) return;

await client.dao.triggerRule(ruleId, encodedPayload);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="Register agent">
        <CodeBlock>{`const { txHash } = await client.agents.registerAgent(
  "my-agent-1",
  "ipfs://Qm..."
);
const meta = await client.agents.getAgentMetadata("my-agent-1");`}</CodeBlock>
      </DocBlock>
    </DocPage>
  );
}
