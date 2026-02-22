import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function DocsContractToContract() {
  return (
    <DocPage
      title="Contract-to-contract calls"
      description="How Vacuum protocol contracts call each other: ExecutionRouter, TreasuryAutomationController, GovernanceExecutorAdapter, and strategy/vault flows."
    >
      <DocBlock title="Overview">
        <p className="mb-2">
          The protocol is designed so that core logic lives in a few contracts that orchestrate others. This page documents which contract calls which, and under what conditions.
        </p>
        <ul className="mb-2 list-inside list-disc text-sm text-zinc-400">
          <li><strong>ExecutionRouter</strong> — User or delegate entry point; calls Uniswap V3, FeeManager, ReferralRegistry, WalletAuth, and (optionally) Strategy NFT/Registry/Subscription.</li>
          <li><strong>TreasuryAutomationController</strong> — Owner-only; calls RiskGuard, then ExecutionRouter for swaps, and vaults for harvest.</li>
          <li><strong>GovernanceExecutorAdapter</strong> — Generic executor: only the configured Governor/Timelock can call <code>execute(target, value, data)</code> to invoke any contract.</li>
        </ul>
      </DocBlock>

      <DocBlock title="ExecutionRouter → other contracts">
        <p className="mb-2">
          On every swap (exact-in/exact-out, single/multi-hop), the router performs these contract-to-contract calls:
        </p>
        <ul className="mb-3 list-inside list-disc text-sm text-zinc-400">
          <li><strong>IWETH(weth).deposit()</strong> — Wraps ETH when tokenIn is WETH and user sends msg.value.</li>
          <li><strong>IERC20(tokenIn).safeTransferFrom(owner, ...)</strong> — Pulls tokens from the owner (or delegate flow uses beneficiary as owner).</li>
          <li><strong>IERC20(tokenIn).forceApprove(uniswapRouter, amountIn)</strong> — Approves the Uniswap V3 SwapRouter.</li>
          <li><strong>uniswapRouter.exactInputSingle</strong> / <strong>exactInput</strong> / <strong>exactOutputSingle</strong> / <strong>exactOutput</strong> — Performs the swap; recipient is the ExecutionRouter.</li>
          <li><strong>FeeManager</strong> — Read: <code>protocolFeeBps()</code>, <code>referralSplitBps()</code>, <code>treasury()</code>. Write: <code>recordFeeCollected(tokenOut, from, feeAmount, referralAmount)</code>. Tokens are sent to <code>feeManager.treasury()</code>.</li>
          <li><strong>ReferralRegistry</strong> — Read: <code>referrerOf(from)</code>. Write: <code>creditReward(referrer, tokenOut, referralAmount)</code> (after transferring tokens to the registry).</li>
          <li><strong>WalletAuthorization</strong> — Read: <code>isAuthorized(beneficiary, msg.sender)</code> when beneficiary is not zero (delegate execution).</li>
          <li><strong>Strategy binding (optional)</strong> — For <code>executeExactInputSingleWithStrategy</code>: <code>strategyNFT.ownerOf(strategyTokenId)</code>, <code>subscriptionManager.isSubscriptionActive(owner, strategyTokenId)</code>, <code>strategyNFT.strategyByToken</code> / <code>versionByToken</code>, <code>strategyRegistry.isActiveVersion(strategy, version)</code>.</li>
        </ul>
        <p className="mb-2 text-sm text-zinc-500">
          After the swap, the router sends output to the user (or unwraps WETH via <code>IWETH(weth).withdraw</code> and <code>payable(to).call&#123; value &#125;</code> for native ETH).
        </p>
      </DocBlock>

      <DocBlock title="TreasuryAutomationController → RiskGuard, ExecutionRouter, Vault">
        <p className="mb-2">
          Treasury automation runs only for the contract owner (e.g. DAO). It enforces risk limits then executes on-chain.
        </p>
        <CodeBlock>{`// 1. RiskGuard (read + write)
riskGuard.validateExecution(address(executionRouter), params_.amountIn, minAmountOutAfterFee_, expectedAmountOut_);
// ... after swap ...
riskGuard.recordSpend(params_.amountIn);

// 2. ExecutionRouter (read + call)
uint256 nonce = executionRouter.executionNonces(treasury);
amountOut = executionRouter.executeExactInputSingle{ value: msg.value }(
  params_, deadline_, treasury, minAmountOutAfterFee_, nonce
);

// 3. Vault harvest (low-level call)
(bool success,) = vault_.call(abi.encodeWithSignature("harvest()"));`}</CodeBlock>
        <p className="mt-2 text-sm text-zinc-500">
          <code>executeVaultHarvest(vault_)</code> is only allowed for whitelisted vaults. The treasury must have approved the ExecutionRouter and (for delegate-style execution) authorized the controller via WalletAuth.
        </p>
      </DocBlock>

      <DocBlock title="GovernanceExecutorAdapter → arbitrary target">
        <p className="mb-2">
          The adapter exposes a single <code>execute(target_, value_, data_)</code>. Only the configured <code>executor</code> (e.g. OpenZeppelin TimelockController) can call it. No protocol-specific logic — pure contract-to-contract delegation.
        </p>
        <CodeBlock>{`// Only executor (e.g. Timelock) can call:
(bool success, bytes memory result) = target_.call{ value: value_ }(data_);
// On failure, reverts with forwarded revert data if any.`}</CodeBlock>
        <p className="mt-2 text-sm text-zinc-500">
          Use this to have governance trigger RiskGuard pause, PolicyEngine rules, or any other contract function by encoding the call in <code>data_</code>.
        </p>
      </DocBlock>

      <DocBlock title="Strategy and marketplace flows">
        <p className="mb-2">
          Other contract-to-contract relationships in the protocol:
        </p>
        <ul className="mb-2 list-inside list-disc text-sm text-zinc-400">
          <li><strong>StrategyRegistry.register</strong> — Mints an NFT via <code>strategyNFT.mint(creator, strategy, creator, 1, metadataURI)</code> and stores strategy/version in the registry.</li>
          <li><strong>StrategyMarketplace</strong> — Uses <code>strategyNFT.ownerOf</code>, <code>creatorByToken</code>, <code>royaltyInfo</code>, and <code>transferFrom(seller, buyer, tokenId)</code> on buy.</li>
          <li><strong>StrategySubscriptionManager</strong> — Reads <code>strategyNFT.creatorByToken(strategyTokenId)</code> for creator payouts.</li>
        </ul>
      </DocBlock>

      <DocBlock title="Summary table">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-[#1e1e2e] pb-2 pr-4 text-left text-zinc-400">Caller</th>
              <th className="border-b border-[#1e1e2e] pb-2 pr-4 text-left text-zinc-400">Callee</th>
              <th className="border-b border-[#1e1e2e] pb-2 text-left text-zinc-400">Purpose</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4">ExecutionRouter</td><td className="border-b border-[#1e1e2e] py-2 pr-4">Uniswap V3 Router</td><td className="border-b border-[#1e1e2e] py-2">Swap execution</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4">ExecutionRouter</td><td className="border-b border-[#1e1e2e] py-2 pr-4">WETH, FeeManager, ReferralRegistry</td><td className="border-b border-[#1e1e2e] py-2">Fees, referral, treasury</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4">ExecutionRouter</td><td className="border-b border-[#1e1e2e] py-2 pr-4">WalletAuthorization</td><td className="border-b border-[#1e1e2e] py-2">Delegate check</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4">ExecutionRouter</td><td className="border-b border-[#1e1e2e] py-2 pr-4">Strategy NFT / Registry / Subscription</td><td className="border-b border-[#1e1e2e] py-2">Strategy-gated execution</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4">TreasuryAutomationController</td><td className="border-b border-[#1e1e2e] py-2 pr-4">RiskGuard</td><td className="border-b border-[#1e1e2e] py-2">Validate + record spend</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4">TreasuryAutomationController</td><td className="border-b border-[#1e1e2e] py-2 pr-4">ExecutionRouter</td><td className="border-b border-[#1e1e2e] py-2">Treasury swap</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4">TreasuryAutomationController</td><td className="border-b border-[#1e1e2e] py-2 pr-4">Vault</td><td className="border-b border-[#1e1e2e] py-2">harvest()</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4">GovernanceExecutorAdapter</td><td className="border-b border-[#1e1e2e] py-2 pr-4">Any (target)</td><td className="border-b border-[#1e1e2e] py-2">Governance execution</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4">StrategyRegistry</td><td className="border-b border-[#1e1e2e] py-2 pr-4">StrategyNFT</td><td className="border-b border-[#1e1e2e] py-2">Mint on register</td></tr>
            <tr><td className="border-b border-[#1e1e2e] py-2 pr-4">StrategyMarketplace</td><td className="border-b border-[#1e1e2e] py-2 pr-4">StrategyNFT</td><td className="border-b border-[#1e1e2e] py-2">Owner, royalty, transfer</td></tr>
          </tbody>
        </table>
      </DocBlock>
    </DocPage>
  );
}
