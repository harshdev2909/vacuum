import hre from "hardhat";
import { ethers } from "hardhat";
import { getAddresses } from "./constants";

// Use env vars or fallback to known Arbitrum Sepolia deployment (must match deploy constructor args)
const DEFAULT_ARB_SEPOLIA = {
  FEE_MANAGER: "0x2f42a9F31FdDC4B882D29e7A9Ff3712f4706Bc67",
  REFERRAL_REGISTRY: "0x673d380C14E9031dD3835976805a99579c679Caa",
  WALLET_AUTH: "0x3d5Ca0C49c3C92b6D7619112cC071357C2DFD0AF",
  EXECUTION_ROUTER: "0xe5f2CFeD1441010a3f79fF904dea7b09e9Ef2a8C",
};

const DEPLOYED_FEE_MANAGER = process.env.DEPLOYED_FEE_MANAGER ?? DEFAULT_ARB_SEPOLIA.FEE_MANAGER;
const DEPLOYED_REFERRAL_REGISTRY = process.env.DEPLOYED_REFERRAL_REGISTRY ?? DEFAULT_ARB_SEPOLIA.REFERRAL_REGISTRY;
const DEPLOYED_WALLET_AUTH = process.env.DEPLOYED_WALLET_AUTH ?? DEFAULT_ARB_SEPOLIA.WALLET_AUTH;
const DEPLOYED_EXECUTION_ROUTER = process.env.DEPLOYED_EXECUTION_ROUTER ?? DEFAULT_ARB_SEPOLIA.EXECUTION_ROUTER;

async function main() {
  const [deployer] = await ethers.getSigners();
  const treasury = process.env.TREASURY_ADDRESS ?? deployer.address;
  const protocolFeeBps = process.env.PROTOCOL_FEE_BPS ? parseInt(process.env.PROTOCOL_FEE_BPS, 10) : 50;
  const referralSplitBps = process.env.REFERRAL_SPLIT_BPS ? parseInt(process.env.REFERRAL_SPLIT_BPS, 10) : 5000;

  console.log("Verifying on network (chainId from provider)...");
  console.log("FeeManager:", DEPLOYED_FEE_MANAGER);
  console.log("ReferralRegistry:", DEPLOYED_REFERRAL_REGISTRY);
  console.log("WalletAuthorization:", DEPLOYED_WALLET_AUTH);
  console.log("ExecutionRouter:", DEPLOYED_EXECUTION_ROUTER);
  console.log("Constructor args: treasury=", treasury, "protocolFeeBps=", protocolFeeBps, "referralSplitBps=", referralSplitBps);
  console.log("");

  const chainId = (await ethers.provider.getNetwork()).chainId;
  const raw = getAddresses(Number(chainId));
  const toChecksum = (addr: string) => ethers.getAddress(addr.toLowerCase());
  const addrs = { swapRouter02: toChecksum(raw.swapRouter02), weth: toChecksum(raw.weth) };

  const contracts: Array<{ name: string; address: string; constructorArguments: unknown[]; contract?: string }> = [
    { name: "FeeManager", address: DEPLOYED_FEE_MANAGER, constructorArguments: [treasury, protocolFeeBps, referralSplitBps] },
    { name: "ReferralRegistry", address: DEPLOYED_REFERRAL_REGISTRY, constructorArguments: [] },
    { name: "WalletAuthorization", address: DEPLOYED_WALLET_AUTH, constructorArguments: [] },
    {
      name: "ExecutionRouter",
      address: DEPLOYED_EXECUTION_ROUTER,
      constructorArguments: [addrs.swapRouter02, addrs.weth, DEPLOYED_FEE_MANAGER, DEPLOYED_REFERRAL_REGISTRY, DEPLOYED_WALLET_AUTH],
      contract: "contracts/ExecutionRouter.sol:ExecutionRouter",
    },
  ];

  for (const c of contracts) {
    let etherscanOk = false;
    try {
      await hre.run("verify:verify", {
        address: c.address,
        constructorArguments: c.constructorArguments,
        ...(c.contract ? { contract: c.contract } : {}),
      });
      console.log("Verified (Etherscan):", c.name);
      etherscanOk = true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Already Verified")) {
        console.log("Already verified (Etherscan):", c.name);
        etherscanOk = true;
      } else {
        console.error("Etherscan verify failed for", c.name, "—", msg.slice(0, 120));
      }
    }
    if (!etherscanOk) {
      try {
        await hre.run("verify:sourcify", { address: c.address });
        console.log("Verified (Sourcify):", c.name);
      } catch (s: unknown) {
        const smsg = s instanceof Error ? s.message : String(s);
        if (smsg.includes("already been verified")) {
          console.log("Already verified (Sourcify):", c.name);
        } else {
          console.error("Sourcify verify failed for", c.name, "—", smsg.slice(0, 100));
        }
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
