import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function SdkDao() {
  return (
    <DocPage
      title="DAO"
      description="RiskGuard, PolicyEngine, treasury exposure, and buyback schedules."
    >
      <DocBlock title="getPolicyStatus">
        <p className="mb-2">Get RiskGuard state: max daily spend, slippage bps, current day spend, paused.</p>
        <CodeBlock>{`const status = await client.dao.getPolicyStatus();
// status.maxDailySpend, status.maxSlippageBps, status.currentDaySpend, status.paused`}</CodeBlock>
      </DocBlock>

      <DocBlock title="canExecute">
        <p className="mb-2">Check if an execution is allowed by RiskGuard for a given target and spend amount.</p>
        <CodeBlock>{`const allowed = await client.dao.canExecute(strategyOrTargetAddress, spendAmountWei);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="createRule / triggerRule">
        <p className="mb-2">Create or update a policy rule (owner). Trigger a rule with execution payload.</p>
        <CodeBlock>{`await client.dao.createRule(
  ruleId,
  conditionType,
  conditionParams,
  executionLimitPerPeriod,
  periodSeconds
);
const { success, txHash } = await client.dao.triggerRule(ruleId, executionPayload);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="getRule / getRuleIds">
        <p className="mb-2">Get a single rule or all rule IDs.</p>
        <CodeBlock>{`const rule = await client.dao.getRule(ruleId);
const ids = await client.dao.getRuleIds();`}</CodeBlock>
      </DocBlock>

      <DocBlock title="Treasury and buyback">
        <p className="mb-2">Treasury address, exposure by token, and buyback schedules.</p>
        <CodeBlock>{`const treasury = await client.dao.getTreasuryAddress();
const exposure = await client.dao.getTreasuryExposure([token1, token2]);
const schedules = await client.dao.getBuybackSchedules();`}</CodeBlock>
      </DocBlock>
    </DocPage>
  );
}
