import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function DocsErrors() {
  return (
    <DocPage
      title="Error handling"
      description="Typed errors and how to handle them."
    >
      <DocBlock title="Error hierarchy">
        <p className="mb-4">All SDK errors extend <code>VacuumError</code> and have a <code>code</code> property.</p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-[#1e1e2e] pb-2 pr-4 text-left text-zinc-400">Error</th>
              <th className="border-b border-[#1e1e2e] pb-2 text-left text-zinc-400">Code</th>
              <th className="border-b border-[#1e1e2e] pb-2 text-left text-zinc-400">When</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>VacuumError</code></td><td className="border-b border-[#1e1e2e] py-2 pr-4">VACUUM_ERROR</td><td className="border-b border-[#1e1e2e] py-2">Base</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>ContractError</code></td><td className="border-b border-[#1e1e2e] py-2 pr-4">CONTRACT_ERROR</td><td className="border-b border-[#1e1e2e] py-2">Revert or contract failure; optional <code>txHash</code></td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>SignerError</code></td><td className="border-b border-[#1e1e2e] py-2 pr-4">SIGNER_ERROR</td><td className="border-b border-[#1e1e2e] py-2">Write call without signer</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>ValidationError</code></td><td className="border-b border-[#1e1e2e] py-2 pr-4">VALIDATION_ERROR</td><td className="border-b border-[#1e1e2e] py-2">Invalid param; optional <code>field</code></td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>SimulationError</code></td><td className="border-b border-[#1e1e2e] py-2 pr-4">SIMULATION_ERROR</td><td className="border-b border-[#1e1e2e] py-2">StaticCall failed</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4"><code>PolicyError</code></td><td className="border-b border-[#1e1e2e] py-2 pr-4">POLICY_ERROR</td><td className="border-b border-[#1e1e2e] py-2">RiskGuard or policy blocked</td></tr>
          </tbody>
        </table>
      </DocBlock>

      <DocBlock title="Handling errors">
        <CodeBlock>{`import { SignerError, ContractError } from "vacuum-sdk";

try {
  await client.execution.swapExactInputSingle(params);
} catch (e) {
  if (e instanceof SignerError) {
    console.error("Connect a wallet");
  } else if (e instanceof ContractError) {
    console.error("Tx failed:", e.txHash, e.message);
  } else {
    console.error(e);
  }
}`}</CodeBlock>
      </DocBlock>
    </DocPage>
  );
}
