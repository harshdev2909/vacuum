export const REFERRAL_REGISTRY_ABI = [
  {
    type: "function",
    name: "registerReferrer",
    stateMutability: "nonpayable",
    inputs: [{ name: "referrer", type: "address", internalType: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimRewards",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "to", type: "address", internalType: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "referrerOf",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ type: "address", internalType: "address" }],
  },
  {
    type: "function",
    name: "earnings",
    stateMutability: "view",
    inputs: [
      { name: "referrer", type: "address", internalType: "address" },
      { name: "token", type: "address", internalType: "address" },
    ],
    outputs: [{ type: "uint256", internalType: "uint256" }],
  },
] as const;
