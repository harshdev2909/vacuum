/** Phase 3: Strategy NFT, Subscription, Marketplace ABIs (minimal for frontend) */

export const STRATEGY_NFT_ABI = [
  { inputs: [{ name: "account", type: "address", internalType: "address" }], name: "balanceOf", outputs: [{ type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }], name: "ownerOf", outputs: [{ type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }], name: "strategyByToken", outputs: [{ type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }], name: "versionByToken", outputs: [{ type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }], name: "creatorByToken", outputs: [{ type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }], name: "tokenURI", outputs: [{ type: "string", internalType: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "to", type: "address", internalType: "address" }, { name: "tokenId", type: "uint256", internalType: "uint256" }], name: "approve", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "operator", type: "address", internalType: "address" }, { name: "approved", type: "bool", internalType: "bool" }], name: "setApprovalForAll", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }], name: "getApproved", outputs: [{ type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "owner", type: "address", internalType: "address" }, { name: "operator", type: "address", internalType: "address" }], name: "isApprovedForAll", outputs: [{ type: "bool", internalType: "bool" }], stateMutability: "view", type: "function" },
] as const;

export const STRATEGY_REGISTRY_ABI = [
  { inputs: [], name: "owner", outputs: [{ type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "strategy", type: "address", internalType: "address" }, { name: "creator", type: "address", internalType: "address" }, { name: "strategyType", type: "uint8", internalType: "enum IStrategyRegistry.StrategyType" }, { name: "riskLevel", type: "uint8", internalType: "uint8" }, { name: "performanceMetricsHash", type: "bytes32", internalType: "bytes32" }, { name: "metadataURI", type: "string", internalType: "string" }], name: "register", outputs: [{ type: "uint256", internalType: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "strategy", type: "address", internalType: "address" }], name: "getTokenId", outputs: [{ type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "strategy", type: "address", internalType: "address" }], name: "getActiveVersion", outputs: [{ type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const STRATEGY_SUBSCRIPTION_ABI = [
  { inputs: [{ name: "strategyTokenId", type: "uint256", internalType: "uint256" }, { name: "durationSeconds", type: "uint256", internalType: "uint256" }, { name: "paymentToken", type: "address", internalType: "address" }, { name: "amount", type: "uint256", internalType: "uint256" }], name: "subscribe", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "strategyTokenId", type: "uint256", internalType: "uint256" }], name: "cancel", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "user", type: "address", internalType: "address" }, { name: "strategyTokenId", type: "uint256", internalType: "uint256" }], name: "isSubscriptionActive", outputs: [{ type: "bool", internalType: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "user", type: "address", internalType: "address" }, { name: "strategyTokenId", type: "uint256", internalType: "uint256" }], name: "subscriptionExpiry", outputs: [{ type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const ROYALTY_DISTRIBUTOR_ABI = [
  { inputs: [{ name: "account", type: "address", internalType: "address" }, { name: "token", type: "address", internalType: "address" }], name: "claimable", outputs: [{ type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "token", type: "address", internalType: "address" }], name: "claim", outputs: [], stateMutability: "nonpayable", type: "function" },
] as const;

export const STRATEGY_MARKETPLACE_ABI = [
  { inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }, { name: "paymentToken", type: "address", internalType: "address" }, { name: "price", type: "uint256", internalType: "uint256" }], name: "list", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }], name: "cancelListing", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }, { name: "affiliate", type: "address", internalType: "address" }], name: "buy", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }], name: "getListing", outputs: [{ type: "address", name: "seller", internalType: "address" }, { type: "address", name: "paymentToken", internalType: "address" }, { type: "uint256", name: "price", internalType: "uint256" }], stateMutability: "view", type: "function" },
] as const;
