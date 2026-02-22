import { DocPage } from "./DocPage";
import { DocBlock, CodeBlock } from "../../components/docs/DocBlock";

export function SdkStrategies() {
  return (
    <DocPage
      title="Strategies"
      description="Strategy NFT registry, subscription, marketplace, and royalty."
    >
      <DocBlock title="registerStrategy">
        <p className="mb-2">Register a strategy (registry owner only). Returns token ID.</p>
        <CodeBlock>{`const { tokenId, txHash } = await client.strategies.registerStrategy({
  strategy: strategyAddress,
  creator: creatorAddress,
  strategyType: 0, // or 1
  riskLevel: 0,
  performanceMetricsHash: "0x...",
  metadataURI: "ipfs://...",
});`}</CodeBlock>
      </DocBlock>

      <DocBlock title="subscribe / cancelSubscription">
        <p className="mb-2">Subscribe to a strategy with payment token and duration. Cancel to end early.</p>
        <CodeBlock>{`await client.strategies.subscribe(strategyTokenId, durationSeconds, paymentToken, amount);
await client.strategies.cancelSubscription(strategyTokenId);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="getSubscriptionStatus">
        <p className="mb-2">Check if user has an active subscription and expiry.</p>
        <CodeBlock>{`const status = await client.strategies.getSubscriptionStatus(user, strategyTokenId);
// status.active, status.expiryTimestamp`}</CodeBlock>
      </DocBlock>

      <DocBlock title="Marketplace">
        <p className="mb-2">List, cancel listing, get listing, and buy strategy NFTs.</p>
        <CodeBlock>{`await client.strategies.listMarketplace(tokenId, paymentToken, price);
await client.strategies.cancelListing(tokenId);
const listing = await client.strategies.getListing(tokenId); // { seller, paymentToken, price } | null
await client.strategies.buyStrategy(tokenId, affiliate?);`}</CodeBlock>
      </DocBlock>

      <DocBlock title="Royalty">
        <p className="mb-2">Get claimable amount and claim royalty for a token.</p>
        <CodeBlock>{`const amount = await client.strategies.getClaimableRoyalty(account, token);
await client.strategies.claimRoyalty(token);`}</CodeBlock>
      </DocBlock>
    </DocPage>
  );
}
