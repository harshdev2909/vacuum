/**
 * Default contract addresses (Arbitrum Sepolia).
 * Override via ArbiClient config or per-call when using other networks.
 */

export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

export const DEFAULT_ADDRESSES = {
  executionRouter: "0xe5f2CFeD1441010a3f79fF904dea7b09e9Ef2a8C",
  referralRegistry: "0x673d380C14E9031dD3835976805a99579c679Caa",
  walletAuth: "0x3d5Ca0C49c3C92b6D7619112cC071357C2DFD0AF",
  feeManager: "0x2f42a9F31FdDC4B882D29e7A9Ff3712f4706Bc67",
  vault: "0xaC85Ad414b9d123554DbcD9470046BA285206b7A",
  strategyRegistry: "0x2a6EC49e2B91279b554592bd1CEdd5F98DE199cF",
  strategyNft: "0xA7eD2A85Ac7d18bF5CcF9705700ecdd835742DdF",
  royaltyDistributor: "0x94bbC7267Ad6e96D7Dd70A468759938D2545E7d6",
  strategySubscriptionManager: "0x40A6C345b6B89e11cA03F157174A7B4db1b59cDA",
  strategyMarketplace: "0xD709d1D7c85f8eCaB1B5b0cA58CaCC7B21FB9EFD",
  riskGuard: "0x786378502e36DBD19472E18ED51fA296d54918F2",
  policyEngine: "0xF46B8af589C6896B8c744acB3465D79AE6F57411",
  treasuryAutomationController: "0x6FC1E35b5e3D2c0C21Fc7B5512a8DA321662Cf95",
  buybackModule: "0x251950EB71DdcAAf195e104Fb9C8A55DDb117dE8",
  governanceExecutorAdapter: "0x52aef193D52Af430a9854F72e3d96013DE7Fde36",
  agentRegistry: "0xC9C3Be78B488349724E56A25E12Abad29F5Df80d",
  agentRevenueDistributor: "0x5FeA0674926cd0A78dc97e0Be7FF3D6e6FBD4136",
  agentSubscriptionManager: "0x37b41e1eB5C3865a03C7ab1a7b90226fE8B9F2f9",
} as const;

export type AddressConfig = Partial<typeof DEFAULT_ADDRESSES>;
