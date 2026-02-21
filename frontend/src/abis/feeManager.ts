export const FEE_MANAGER_ABI = [
  {
    type: "function",
    name: "protocolFeeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "referralSplitBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "treasury",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address", internalType: "address" }],
  },
  {
    type: "function",
    name: "totalFeesCollected",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [{ type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "withdrawToTreasury",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
  },
] as const;
