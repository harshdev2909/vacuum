import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function DocsSecurity() {
  return (
    <DocPage
      title="Security"
      description="Best practices and security notes."
    >
      <DocBlock title="Private keys">
        <p className="mb-4">Never commit private keys or hardcode them. Use environment variables or a secure signer provider (e.g. HSM or wallet service).</p>
        <CodeBlock>{`const wallet = new Wallet(process.env.PRIVATE_KEY, provider);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="Swaps">
        <ul className="list-disc space-y-2 pl-6 text-zinc-300">
          <li>Always set a <code>deadline</code> (unix timestamp) so the transaction cannot be stuck.</li>
          <li>Use <code>minAmountOutAfterFee</code> or <code>swapExactInputSingleWithSlippage</code> to limit slippage.</li>
          <li>Prefer <code>simulateSwap</code> before sending a live swap.</li>
        </ul>
      </DocBlock>

      <DocBlock title="DAO and automation">
        <ul className="list-disc space-y-2 pl-6 text-zinc-300">
          <li>Check <code>getPolicyStatus()</code> and <code>canExecute()</code> before submitting automated actions.</li>
          <li>Respect RiskGuard daily spend and slippage limits.</li>
          <li>Validate policy rule conditions before triggering.</li>
        </ul>
      </DocBlock>

      <DocBlock title="Simulation">
        <p className="mb-4">Use read-only and simulation calls when possible to avoid reverts and unnecessary gas.</p>
        <CodeBlock>{`const quote = await client.execution.simulateSwap(params);`}</CodeBlock>
      </DocBlock>
    </DocPage>
  );
}
