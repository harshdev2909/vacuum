export const EXECUTION_ROUTER_ABI = [
  {
    type: "function",
    name: "executeExactInputSingle",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IV3SwapRouter.ExactInputSingleParams",
        components: [
          { name: "tokenIn", type: "address", internalType: "address" },
          { name: "tokenOut", type: "address", internalType: "address" },
          { name: "fee", type: "uint24", internalType: "uint24" },
          { name: "recipient", type: "address", internalType: "address" },
          { name: "amountIn", type: "uint256", internalType: "uint256" },
          { name: "amountOutMinimum", type: "uint256", internalType: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160", internalType: "uint160" },
        ],
      },
      { name: "deadline", type: "uint256", internalType: "uint256" },
      { name: "beneficiary", type: "address", internalType: "address" },
      { name: "minAmountOutAfterFee", type: "uint256", internalType: "uint256" },
      { name: "nonce", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "executionNonces",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
    outputs: [{ type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "weth",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address", internalType: "address" }],
  },
] as const;
