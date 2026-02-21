/**
 * Run this while your local node is up (npm run node:fork).
 * Deploys ExecutionRouter (and deps) to localhost, then swaps ~$1 ETH → ARB (or USDC on mainnet fork).
 *
 * In terminal 1: npm run node:fork
 * In terminal 2: npx hardhat run scripts/deploy-and-swap-localhost.ts --network localhost
 */
import "dotenv/config";
import { ethers } from "hardhat";
import { getAddresses } from "./constants";

function toChecksum(addr: string) {
  return ethers.getAddress(addr.toLowerCase());
}

async function main() {
  const [signer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const addrs = getAddresses(chainId);
  const outToken =
    "usdc" in addrs ? (addrs as { usdc?: string }).usdc : "arb" in addrs ? (addrs as { arb?: string }).arb : null;
  if (!outToken) throw new Error("Output token not configured.");

  const wethAddress = toChecksum(addrs.weth);
  const outTokenChecksum = toChecksum(outToken);
  const amountEth = process.env.SWAP_ETH_AMOUNT ?? "0.0004";
  const amountInWei = ethers.parseEther(amountEth);
  const deadline = Math.floor(Date.now() / 1000) + 300;
  const outSymbol = chainId === 42161 ? "USDC" : chainId === 421614 ? "ARB" : "token";
  const outDecimals = chainId === 42161 ? 6 : 18;

  console.log("Deploying to localhost...");
  const raw = getAddresses(chainId);
  const treasury = signer.address;
  const fm = await (await ethers.getContractFactory("FeeManager")).deploy(treasury, 50, 5000);
  await fm.waitForDeployment();
  const reg = await (await ethers.getContractFactory("ReferralRegistry")).deploy();
  await reg.waitForDeployment();
  const walletAuth = await (await ethers.getContractFactory("WalletAuthorization")).deploy();
  await walletAuth.waitForDeployment();
  const router = await (
    await ethers.getContractFactory("ExecutionRouter")
  ).deploy(
    toChecksum(raw.swapRouter02),
    toChecksum(raw.weth),
    await fm.getAddress(),
    await reg.getAddress(),
    await walletAuth.getAddress()
  );
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  await fm.setExecutor(routerAddress);
  await reg.setExecutor(routerAddress);
  console.log("ExecutionRouter at", routerAddress);

  const nonce = await router.executionNonces(signer.address);
  const params = {
    tokenIn: wethAddress,
    tokenOut: outTokenChecksum,
    fee: 3000,
    recipient: routerAddress,
    amountIn: amountInWei,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0n,
  };

  console.log(`\nSwap ETH → ${outSymbol} (~$1)...`);
  const tx = await router.executeExactInputSingle(
    params,
    deadline,
    ethers.ZeroAddress,
    0n,
    nonce,
    { value: amountInWei }
  );
  const receipt = await tx.wait();
  console.log("Tx hash:", receipt?.hash);

  const token = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)"],
    outTokenChecksum
  );
  const balance = await token.balanceOf(signer.address);
  console.log("Received:", ethers.formatUnits(balance, outDecimals), outSymbol);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
