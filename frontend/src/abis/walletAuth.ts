export const WALLET_AUTH_ABI = [
  {
    type: "function",
    name: "authorizeDelegate",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "delegate", type: "address", internalType: "address" },
      { name: "deadline", type: "uint256", internalType: "uint256" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeDelegate",
    stateMutability: "nonpayable",
    inputs: [{ name: "delegate", type: "address", internalType: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isAuthorized",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "delegate", type: "address", internalType: "address" },
    ],
    outputs: [{ type: "bool", internalType: "bool" }],
  },
  {
    type: "function",
    name: "nonces",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
    outputs: [{ type: "uint256", internalType: "uint256" }],
  },
] as const;
