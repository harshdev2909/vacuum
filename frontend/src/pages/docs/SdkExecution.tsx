import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function SdkExecution() {
  return (
    <DocPage
      title="Execution"
      description="Swap, quote, simulate, and approve via ExecutionRouter."
    >
      <DocBlock title="getQuote">
        <p className="mb-2">Get expected output amount by simulating a swap (no transaction).</p>
        <CodeBlock>{`const quote = await client.execution.getQuote({
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
// quote.amountOut, quote.amountIn`}</CodeBlock>
      </DocBlock>

      <DocBlock title="simulateSwap">
        <p className="mb-2">StaticCall the router to get amountOut without sending a tx.</p>
        <CodeBlock>{`const result = await client.execution.simulateSwap({
  exactInputSingle: { ... },
  deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
  beneficiary: wallet.address,
  minAmountOutAfterFee: 0n,
});`}</CodeBlock>
      </DocBlock>

      <DocBlock title="swapExactInputSingle">
        <p className="mb-2">Execute exact-input single swap. Requires signer. Use <code>swapExactInputSingleWithSlippage</code> to compute min amount from slippage bps.</p>
        <CodeBlock>{`const { amountOut, txHash } = await client.execution.swapExactInputSingle(params);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="swapExactInputSingleWithSlippage">
        <p className="mb-2">Same as above but accepts <code>slippageBps</code> (e.g. 50 = 0.5%) and sets <code>minAmountOutAfterFee</code> automatically.</p>
        <CodeBlock>{`const { amountOut, txHash } = await client.execution.swapExactInputSingleWithSlippage({
  exactInputSingle: { ... },
  deadline,
  beneficiary: wallet.address,
  slippageBps: 50,
});`}</CodeBlock>
      </DocBlock>

      <DocBlock title="approveToken">
        <p className="mb-2">Approve token spend for the router (or custom spender).</p>
        <CodeBlock>{`const { txHash } = await client.execution.approveToken(
  tokenAddress,
  amount,
  spender // optional, defaults to router
);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="Parameters">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-[#1e1e2e] pb-2 pr-4 text-left text-zinc-400">Param</th>
              <th className="border-b border-[#1e1e2e] pb-2 text-left text-zinc-400">Type</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>exactInputSingle.tokenIn / tokenOut</code></td><td className="border-b border-[#1e1e2e] py-2">address</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>fee</code></td><td className="border-b border-[#1e1e2e] py-2">uint24 (e.g. 500)</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>amountIn / amountOutMinimum</code></td><td className="border-b border-[#1e1e2e] py-2">bigint</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>deadline</code></td><td className="border-b border-[#1e1e2e] py-2">unix timestamp (bigint)</td></tr>
          </tbody>
        </table>
      </DocBlock>
    </DocPage>
  );
}
