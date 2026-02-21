/**
 * Verify Phase 3 contracts on block explorer.
 * Set env: DEPLOYED_STRATEGY_REGISTRY, DEPLOYED_STRATEGY_NFT, DEPLOYED_ROYALTY_DISTRIBUTOR,
 * DEPLOYED_SUBSCRIPTION_MANAGER, DEPLOYED_STRATEGY_MARKETPLACE, TREASURY_ADDRESS
 */
import hre from "hardhat";

const DEPLOYED_STRATEGY_REGISTRY = process.env.DEPLOYED_STRATEGY_REGISTRY ?? "0x2a6EC49e2B91279b554592bd1CEdd5F98DE199cF";
const DEPLOYED_STRATEGY_NFT = process.env.DEPLOYED_STRATEGY_NFT ?? "0xA7eD2A85Ac7d18bF5CcF9705700ecdd835742DdF";
const DEPLOYED_ROYALTY_DISTRIBUTOR = process.env.DEPLOYED_ROYALTY_DISTRIBUTOR ?? "0x94bbC7267Ad6e96D7Dd70A468759938D2545E7d6";
const DEPLOYED_SUBSCRIPTION_MANAGER = process.env.DEPLOYED_SUBSCRIPTION_MANAGER ?? "0x40A6C345b6B89e11cA03F157174A7B4db1b59cDA";
const DEPLOYED_STRATEGY_MARKETPLACE = process.env.DEPLOYED_STRATEGY_MARKETPLACE ?? "0xD709d1D7c85f8eCaB1B5b0cA58CaCC7B21FB9EFD";
const TREASURY = process.env.TREASURY_ADDRESS ?? "0x37fCF5FfFF81f33A045ec8F7FDbEDE9dd58E6608";

async function main() {
  const contracts: Array<{ name: string; address: string; constructorArguments: unknown[]; contract?: string }> = [
    { name: "StrategyRegistry", address: DEPLOYED_STRATEGY_REGISTRY, constructorArguments: [] },
    { name: "StrategyNFT", address: DEPLOYED_STRATEGY_NFT, constructorArguments: [500], contract: "contracts/strategy/StrategyNFT.sol:StrategyNFT" },
    { name: "RoyaltyDistributor", address: DEPLOYED_ROYALTY_DISTRIBUTOR, constructorArguments: [TREASURY, 500, 300, 200], contract: "contracts/royalty/RoyaltyDistributor.sol:RoyaltyDistributor" },
    { name: "StrategySubscriptionManager", address: DEPLOYED_SUBSCRIPTION_MANAGER, constructorArguments: [DEPLOYED_STRATEGY_NFT, DEPLOYED_ROYALTY_DISTRIBUTOR], contract: "contracts/subscription/StrategySubscriptionManager.sol:StrategySubscriptionManager" },
    { name: "StrategyMarketplace", address: DEPLOYED_STRATEGY_MARKETPLACE, constructorArguments: [DEPLOYED_STRATEGY_NFT, DEPLOYED_ROYALTY_DISTRIBUTOR], contract: "contracts/marketplace/StrategyMarketplace.sol:StrategyMarketplace" },
  ];

  for (const c of contracts) {
    try {
      await hre.run("verify:verify", {
        address: c.address,
        constructorArguments: c.constructorArguments,
        ...(c.contract ? { contract: c.contract } : {}),
      });
      console.log("Verified:", c.name);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Already Verified") || msg.includes("already verified")) {
        console.log("Already verified:", c.name);
      } else {
        console.error("Verify failed for", c.name, "—", msg.slice(0, 150));
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
