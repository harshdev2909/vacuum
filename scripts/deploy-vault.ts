/**
 * Deploy Phase 1: VaultFactory and optionally one Vault + UniswapV3 LP Strategy.
 * Usage:
 *   npx hardhat run scripts/deploy-vault.ts --network arbitrum-sepolia
 *   npx hardhat run scripts/deploy-vault.ts --network arbitrum-one
 *   CREATE_VAULT_WITH_STRATEGY=1 npx hardhat run scripts/deploy-vault.ts --network arbitrum-one
 *
 * For createVaultWithUniswapV3Strategy you need a pool (e.g. USDC/WETH 0.3% on Arbitrum One).
 * Set ASSET, POOL, TICK_LOWER, TICK_UPPER or we use defaults for Arbitrum One.
 */
import { ethers } from "hardhat";
import { getAddresses } from "./constants";

function toChecksum(addr: string): string {
  return ethers.getAddress(addr.toLowerCase());
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const raw = getAddresses(Number(chainId));
  const addrs = {
    swapRouter02: toChecksum(raw.swapRouter02),
    weth: toChecksum(raw.weth),
    nonfungiblePositionManager:
      "nonfungiblePositionManager" in raw ? toChecksum((raw as { nonfungiblePositionManager: string }).nonfungiblePositionManager) : "",
    uniswapV3Factory: "uniswapV3Factory" in raw ? toChecksum((raw as { uniswapV3Factory: string }).uniswapV3Factory) : "",
    usdc: "usdc" in raw ? toChecksum((raw as { usdc: string }).usdc) : "",
    usdcWethPool3000: "usdcWethPool3000" in raw ? toChecksum((raw as { usdcWethPool3000: string }).usdcWethPool3000) : "",
  };

  const treasury = process.env.TREASURY_ADDRESS ?? deployer.address;
  const createWithStrategy = process.env.CREATE_VAULT_WITH_STRATEGY === "1";

  console.log("Deploying VaultFactory with account:", deployer.address);
  console.log("ChainId:", chainId.toString());
  console.log("Treasury:", treasury);

  const VaultFactory = await ethers.getContractFactory("VaultFactory");
  const factory = await VaultFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("VaultFactory deployed:", factoryAddress);

  if (!createWithStrategy) {
    let vaultAddress: string | undefined;
    if (addrs.usdc) {
      const depositCap = process.env.DEPOSIT_CAP ?? ethers.parseUnits("1000000", 6);
      const performanceFeeBps = process.env.PERFORMANCE_FEE_BPS ? parseInt(process.env.PERFORMANCE_FEE_BPS, 10) : 1000;
      const withdrawalFeeBps = process.env.WITHDRAWAL_FEE_BPS ? parseInt(process.env.WITHDRAWAL_FEE_BPS, 10) : 0;
      const tx = await factory.createVault(
        addrs.usdc,
        "USDC Vault",
        "vUSDC",
        treasury,
        depositCap,
        performanceFeeBps,
        withdrawalFeeBps
      );
      await tx.wait();
      vaultAddress = await factory.getVaultAt((await factory.vaultCount()) - 1n);
      console.log("Vault created:", vaultAddress);
    }
    console.log("\n--- Summary ---");
    console.log("VaultFactory:", factoryAddress);
    if (vaultAddress) console.log("Vault:", vaultAddress);
    console.log("\nExport: DEPLOYED_VAULT_FACTORY=" + factoryAddress);
    if (vaultAddress) console.log("Export: DEPLOYED_VAULT=" + vaultAddress);
    console.log("To create vault + UniswapV3 strategy: set CREATE_VAULT_WITH_STRATEGY=1 and re-run (Arbitrum One with USDC recommended).");
    return;
  }

  if (Number(chainId) !== 42161 || !addrs.usdc || !addrs.nonfungiblePositionManager || !addrs.usdcWethPool3000) {
    console.log("Skipping createVaultWithUniswapV3Strategy: need arbitrum-one and USDC + NonfungiblePositionManager + pool. Deploy factory only.");
    return;
  }

  const UniswapV3VaultFactory = await ethers.getContractFactory("UniswapV3VaultFactory");
  const uniswapV3Factory = await UniswapV3VaultFactory.deploy(factoryAddress);
  await uniswapV3Factory.waitForDeployment();

  const asset = process.env.ASSET ?? addrs.usdc;
  const depositCap = process.env.DEPOSIT_CAP ?? ethers.parseUnits("1000000", 6); // 1M USDC
  const performanceFeeBps = process.env.PERFORMANCE_FEE_BPS ? parseInt(process.env.PERFORMANCE_FEE_BPS, 10) : 1000; // 10%
  const withdrawalFeeBps = process.env.WITHDRAWAL_FEE_BPS ? parseInt(process.env.WITHDRAWAL_FEE_BPS, 10) : 0;
  const poolAddr = process.env.POOL ?? addrs.usdcWethPool3000;
  const tickLower = process.env.TICK_LOWER ? parseInt(process.env.TICK_LOWER, 10) : -887220; // wide range
  const tickUpper = process.env.TICK_UPPER ? parseInt(process.env.TICK_UPPER, 10) : 887220;

  await uniswapV3Factory.createVaultWithUniswapV3Strategy(
    asset,
    "USDC Vault",
    "vUSDC",
    treasury,
    depositCap,
    performanceFeeBps,
    withdrawalFeeBps,
    addrs.nonfungiblePositionManager,
    addrs.swapRouter02,
    poolAddr,
    tickLower,
    tickUpper
  );
  const vaultAddress = await uniswapV3Factory.lastVault();
  const strategyAddress = await uniswapV3Factory.lastStrategy();
  console.log("Vault created:", vaultAddress);
  console.log("Strategy created:", strategyAddress);
  const Vault = await ethers.getContractFactory("Vault");
  const vault = Vault.attach(vaultAddress);
  await factory.registerVault(vault);
  console.log("\n--- Summary ---");
  console.log("VaultFactory:", factoryAddress);
  console.log("UniswapV3VaultFactory:", await uniswapV3Factory.getAddress());
  console.log("Vault:", vaultAddress);
  console.log("Export: DEPLOYED_VAULT_FACTORY=" + factoryAddress);
  console.log("Export: DEPLOYED_VAULT=" + vaultAddress);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
