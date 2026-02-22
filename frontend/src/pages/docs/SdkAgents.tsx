import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function SdkAgents() {
  return (
    <DocPage
      title="Agents"
      description="Agent registry, staking, subscription, and revenue claim."
    >
      <DocBlock title="registerAgent / updateAgent / deactivateAgent">
        <p className="mb-2">Register an agent (bytes32 id or string hashed), update metadata, or deactivate.</p>
        <CodeBlock>{`await client.agents.registerAgent(agentId, metadataURI);
await client.agents.updateAgent(agentId, metadataURI, active);
await client.agents.deactivateAgent(agentId);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="getAgentMetadata / isAgentActive">
        <p className="mb-2">Get creator, metadata URI, active flag; or just check active.</p>
        <CodeBlock>{`const meta = await client.agents.getAgentMetadata(agentId);
const active = await client.agents.isAgentActive(agentId);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="stakeAgent / unstakeAgent">
        <p className="mb-2">Stake or unstake on an agent (requires AgentStaking contract configured).</p>
        <CodeBlock>{`await client.agents.stakeAgent(agentId, amount);
await client.agents.unstakeAgent(agentId, amount);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="subscribeToAgent / getAgentSubscriptionStatus">
        <p className="mb-2">Subscribe to an agent with payment; check subscription status.</p>
        <CodeBlock>{`await client.agents.subscribeToAgent(agentId, durationSeconds, paymentToken, amount);
const { active, expiry } = await client.agents.getAgentSubscriptionStatus(user, agentId);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="claimAgentRevenue / getClaimableAgentRevenue">
        <p className="mb-2">Claim revenue (creator) or check claimable amount.</p>
        <CodeBlock>{`const amount = await client.agents.getClaimableAgentRevenue(account, token);
await client.agents.claimAgentRevenue(token);`}</CodeBlock>
      </DocBlock>
    </DocPage>
  );
}
