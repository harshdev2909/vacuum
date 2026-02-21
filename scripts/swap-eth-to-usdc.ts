import "dotenv/config";
import { ethers } from "hardhat";
import { getAddresses } from "./constants";

async function main() {
  const routerAddress = process.env.DEPLOYED_EXECUTION_ROUTER;
  if (!routerAddress) {
    throw new Error("Set DEPLOYED_EXECUTION_ROUTER in .env (your ExecutionRouter contract address)");
  }

  const [signer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const addrs = getAddresses(chainId);

  const usdcAddress =
    "usdc" in addrs
      ? (addrs as { usdc?: string }).usdc
      : "arb" in addrs
        ? (addrs as { arb?: string }).arb
        : process.env.SEPOLIA_USDC ?? null;
  if (!usdcAddress) {
    throw new Error(
      "Output token not configured. Use --network arbitrum-one for USDC, or arbitrum-sepolia for ARB testnet."
    );
  }

  const wethAddress = ethers.getAddress(addrs.weth.toLowerCase());
  const usdcChecksum = ethers.getAddress(usdcAddress.toLowerCase());

  const amountEth = process.env.SWAP_ETH_AMOUNT ?? "0.0004";
  const amountInWei = ethers.parseEther(amountEth);
  const minUsdcOut = process.env.MIN_USDC_OUT
    ? ethers.parseUnits(process.env.MIN_USDC_OUT, 6)
    : 0n;
  const deadline = Math.floor(Date.now() / 1000) + 300;

  const router = await ethers.getContractAt("ExecutionRouter", routerAddress);
  const nonce = await router.executionNonces(signer.address);

  const params = {
    tokenIn: wethAddress,
    tokenOut: usdcChecksum,
    fee: 3000,
    recipient: routerAddress,
    amountIn: amountInWei,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0n,
  };

  const outSymbol = chainId === 42161 ? "USDC" : chainId === 421614 ? "ARB" : "token";
  console.log(`Swap ETH → ${outSymbol}`);
  console.log("  Network:    ", chainId === 42161 ? "Arbitrum One" : chainId === 421614 ? "Arbitrum Sepolia" : chainId);
  console.log("  From:       ", signer.address);
  console.log("  Amount ETH: ", amountEth);
  console.log("  Min out:    ", minUsdcOut.toString());
  console.log("  Nonce:      ", nonce.toString());

  const tx = await router.executeExactInputSingle(
    params,
    deadline,
    ethers.ZeroAddress,
    minUsdcOut,
    nonce,
    { value: amountInWei }
  );
  const receipt = await tx.wait();
  console.log("  Tx hash:    ", receipt?.hash);
  console.log("  Block:      ", receipt?.blockNumber);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
