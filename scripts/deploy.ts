import { ethers } from "hardhat";
import { getAddresses } from "./constants";

function toChecksumAddress(addr: string): string {
  return ethers.getAddress(addr.toLowerCase());
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const raw = getAddresses(Number(chainId));
  const addrs = {
    swapRouter02: toChecksumAddress(raw.swapRouter02),
    weth: toChecksumAddress(raw.weth),
  };

  console.log("Deploying with account:", deployer.address);
  console.log("ChainId:", chainId.toString());
  console.log("SwapRouter02:", addrs.swapRouter02);
  console.log("WETH:", addrs.weth);

  const treasury = process.env.TREASURY_ADDRESS ?? deployer.address;
  const protocolFeeBps = process.env.PROTOCOL_FEE_BPS ? parseInt(process.env.PROTOCOL_FEE_BPS, 10) : 50;
  const referralSplitBps = process.env.REFERRAL_SPLIT_BPS ? parseInt(process.env.REFERRAL_SPLIT_BPS, 10) : 5000;

  const FeeManagerFactory = await ethers.getContractFactory("FeeManager");
  const fm = await FeeManagerFactory.deploy(treasury, protocolFeeBps, referralSplitBps);
  await fm.waitForDeployment();
  const fmAddress = await fm.getAddress();
  console.log("FeeManager deployed:", fmAddress);

  const ReferralRegistryFactory = await ethers.getContractFactory("ReferralRegistry");
  const reg = await ReferralRegistryFactory.deploy();
  await reg.waitForDeployment();
  const regAddress = await reg.getAddress();
  console.log("ReferralRegistry deployed:", regAddress);

  const WalletAuthFactory = await ethers.getContractFactory("WalletAuthorization");
  const walletAuth = await WalletAuthFactory.deploy();
  await walletAuth.waitForDeployment();
  const walletAuthAddress = await walletAuth.getAddress();
  console.log("WalletAuthorization deployed:", walletAuthAddress);

  const RouterFactory = await ethers.getContractFactory("ExecutionRouter");
  const router = await RouterFactory.deploy(
    addrs.swapRouter02,
    addrs.weth,
    fmAddress,
    regAddress,
    walletAuthAddress
  );
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("ExecutionRouter deployed:", routerAddress);

  const setExecutorTx1 = await fm.setExecutor(routerAddress);
  await setExecutorTx1.wait();
  console.log("FeeManager executor set to ExecutionRouter");
  const setExecutorTx2 = await reg.setExecutor(routerAddress);
  await setExecutorTx2.wait();
  console.log("ReferralRegistry executor set to ExecutionRouter");

  console.log("\n--- Summary ---");
  console.log("FeeManager:", fmAddress);
  console.log("ReferralRegistry:", regAddress);
  console.log("WalletAuthorization:", walletAuthAddress);
  console.log("ExecutionRouter:", routerAddress);
  console.log("\nExport for verify script:");
  console.log("DEPLOYED_FEE_MANAGER=" + fmAddress);
  console.log("DEPLOYED_REFERRAL_REGISTRY=" + regAddress);
  console.log("DEPLOYED_WALLET_AUTH=" + walletAuthAddress);
  console.log("DEPLOYED_EXECUTION_ROUTER=" + routerAddress);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
