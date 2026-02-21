/**
 * Contract addresses: Arbitrum Sepolia (testnet) and Arbitrum One (mainnet)
 * Uniswap V3 per https://docs.uniswap.org/contracts/v3/reference/deployments/arbitrum-deployments
 */
export const ADDRESSES = {
  arbitrumSepolia: {
    swapRouter02: "0x101F443B4d1b059569D643917553c771E1b9663E" as const,
    weth: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73" as const,
    arb: "0x414CCf6A4ce15BC5fda47595b9A9CB7561dE9ac9" as const,
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4D" as const,
    nonfungiblePositionManager: "0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65" as const,
    uniswapV3Factory: "0x248AB79Bbb9bC29bB72f7Cd42F17e054Fc40188e" as const,
  },
  arbitrumOne: {
    swapRouter02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as const,
    weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as const,
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const,
    nonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88" as const,
    uniswapV3Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as const,
    /** USDC/WETH 0.3% pool - get via factory.getPool(usdc, weth, 3000) if not set */
    usdcWethPool3000: "0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443" as const,
  },
} as const;

export function getAddresses(chainId: number) {
  if (chainId === 421614) return ADDRESSES.arbitrumSepolia;
  if (chainId === 42161) return ADDRESSES.arbitrumOne;
  return ADDRESSES.arbitrumSepolia;
}
