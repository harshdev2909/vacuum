
import "dotenv/config";
import { ethers } from "hardhat";
import { getAddresses } from "./constants";

function toChecksum(addr: string) {
  return ethers.getAddress(addr.toLowerCase());
}

async function ok(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log("  ✓", name);
    return true;
  } catch (e: any) {
    console.log("  ✗", name, "—", e.message?.slice(0, 60) || e);
    return false;
  }
}

async function main() {
  const signers = await ethers.getSigners();
  const [owner, account1, account2, account3] = signers;
  if (signers.length < 4) throw new Error("Need at least 4 accounts. Use FORK_MAINNET=1 and same node accounts.");
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const addrs = getAddresses(chainId);
  const usdc = "usdc" in addrs ? (addrs as { usdc?: string }).usdc : null;
  if (!usdc || chainId !== 42161) throw new Error("Need Arbitrum One fork (FORK_MAINNET=1) for USDC.");
  const weth = toChecksum(addrs.weth);
  const usdcChecksum = toChecksum(usdc);
  const raw = getAddresses(chainId);

  console.log("\n--- Deploy ---");
  const fm = await (await ethers.getContractFactory("FeeManager")).deploy(owner.address, 50, 5000);
  await fm.waitForDeployment();
  const reg = await (await ethers.getContractFactory("ReferralRegistry")).deploy();
  await reg.waitForDeployment();
  const walletAuth = await (await ethers.getContractFactory("WalletAuthorization")).deploy();
  await walletAuth.waitForDeployment();
  const router = await (
    await ethers.getContractFactory("ExecutionRouter")
  ).deploy(
    toChecksum(raw.swapRouter02),
    weth,
    await fm.getAddress(),
    await reg.getAddress(),
    await walletAuth.getAddress()
  );
  await router.waitForDeployment();
  await fm.setExecutor(await router.getAddress());
  await reg.setExecutor(await router.getAddress());
  const routerAddress = await router.getAddress();
  console.log("ExecutionRouter:", routerAddress);

  console.log("\n--- FeeManager ---");
  await ok("setFeeConfig(100, 3000)", () => fm.connect(owner).setFeeConfig(100, 3000));
  await ok("setTreasury(account1)", () => fm.connect(owner).setTreasury(account1.address));
  await ok("protocolFeeBps()", async () => {
    const bps = await fm.protocolFeeBps();
    if (bps !== 100n) throw new Error(`expected 100 got ${bps}`);
  });
  await ok("referralSplitBps()", async () => {
    const bps = await fm.referralSplitBps();
    if (bps !== 3000n) throw new Error(`expected 3000 got ${bps}`);
  });
  await ok("treasury()", async () => {
    const t = await fm.treasury();
    if (t !== account1.address) throw new Error(`wrong treasury ${t}`);
  });
  await ok("computeProtocolFee(1000)", async () => {
    const fee = await fm.computeProtocolFee(1000);
    if (fee !== 10n) throw new Error(`expected 10 got ${fee}`);
  });
  await ok("setTreasury(owner) (restore)", () => fm.connect(owner).setTreasury(owner.address));

  console.log("\n--- ReferralRegistry ---");
  await ok("registerReferrer(account2) by account1", () => reg.connect(account1).registerReferrer(account2.address));
  await ok("referrerOf(account1) === account2", async () => {
    const r = await reg.referrerOf(account1.address);
    if (r !== account2.address) throw new Error(`expected ${account2.address} got ${r}`);
  });
  await ok("registerReferrer reverts (already bound)", async () => {
    try {
      await reg.connect(account1).registerReferrer(account3.address);
    } catch {
      return;
    }
    throw new Error("should revert");
  });

  console.log("\n--- WalletAuthorization ---");
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const nonce0 = await walletAuth.nonces(owner.address);
  const domain = {
    name: "ArbiExecutionLayer",
    version: "1",
    chainId,
    verifyingContract: await walletAuth.getAddress(),
  };
  const types = {
    DelegateAuthorization: [
      { name: "owner", type: "address" },
      { name: "delegate", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  const sig = await owner.signTypedData(
    domain,
    types,
    { owner: owner.address, delegate: account1.address, nonce: nonce0, deadline }
  );
  await ok("authorizeDelegate(owner, account1, sig)", () =>
    walletAuth.authorizeDelegate(owner.address, account1.address, deadline, sig)
  );
  await ok("isAuthorized(owner, account1) === true", async () => {
    const a = await walletAuth.isAuthorized(owner.address, account1.address);
    if (!a) throw new Error("expected true");
  });
  await ok("revokeDelegate(account1) by owner", () => walletAuth.connect(owner).revokeDelegate(account1.address));
  await ok("isAuthorized(owner, account1) === false", async () => {
    const a = await walletAuth.isAuthorized(owner.address, account1.address);
    if (a) throw new Error("expected false");
  });

  console.log("\n--- ExecutionRouter (views) ---");
  await ok("executionNonces(owner)", async () => {
    const n = await router.executionNonces(owner.address);
    if (n !== 0n) throw new Error(`expected 0 got ${n}`);
  });
  await ok("uniswapRouter(), weth()", async () => {
    if ((await router.uniswapRouter()) !== raw.swapRouter02) throw new Error("router");
    if ((await router.weth()).toLowerCase() !== weth.toLowerCase()) throw new Error("weth");
  });

  console.log("\n--- ExecutionRouter (pause) ---");
  await ok("pause() by owner", () => router.connect(owner).pause());
  await ok("executeExactInputSingle reverts when paused", async () => {
    try {
      await router.connect(owner).executeExactInputSingle(
        {
          tokenIn: weth,
          tokenOut: usdcChecksum,
          fee: 3000,
          recipient: routerAddress,
          amountIn: ethers.parseEther("0.0004"),
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0n,
        },
        Math.floor(Date.now() / 1000) + 300,
        ethers.ZeroAddress,
        0n,
        0,
        { value: ethers.parseEther("0.0004") }
      );
    } catch {
      return;
    }
    throw new Error("should revert");
  });
  await ok("unpause() by owner", () => router.connect(owner).unpause());

  console.log("\n--- ExecutionRouter (swap ETH → USDC) ---");
  const nonce = await router.executionNonces(owner.address);
  await ok("executeExactInputSingle", () =>
    router.connect(owner).executeExactInputSingle(
      {
        tokenIn: weth,
        tokenOut: usdcChecksum,
        fee: 3000,
        recipient: routerAddress,
        amountIn: ethers.parseEther("0.0004"),
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      },
      Math.floor(Date.now() / 1000) + 300,
      ethers.ZeroAddress,
      0n,
      nonce,
      { value: ethers.parseEther("0.0004") }
    )
  );

  console.log("\n--- Post-swap: FeeManager & ReferralRegistry ---");
  await ok("totalFeesCollected(USDC) > 0", async () => {
    const t = await fm.totalFeesCollected(usdcChecksum);
    if (t === 0n) throw new Error("expected > 0");
  });
  await ok("treasury balance USDC (owner)", async () => {
    const erc20 = await ethers.getContractAt(["function balanceOf(address) view returns (uint256)"], usdcChecksum);
    const b = await erc20.balanceOf(owner.address);
    if (b === 0n) throw new Error("treasury should have received fee");
  });

  console.log("\n--- Referral: account2 = referrer for account1; swap by account1 so account2 earns ---");
  await ok("account1 swap with referrer (account2)", async () => {
    const n = await router.executionNonces(account1.address);
    return router
      .connect(account1)
      .executeExactInputSingle(
        {
          tokenIn: weth,
          tokenOut: usdcChecksum,
          fee: 3000,
          recipient: routerAddress,
          amountIn: ethers.parseEther("0.0004"),
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0n,
        },
        Math.floor(Date.now() / 1000) + 300,
        ethers.ZeroAddress,
        0n,
        n,
        { value: ethers.parseEther("0.0004") }
      );
  });
  await ok("earnings(account2, USDC) > 0", async () => {
    const e = await reg.earnings(account2.address, usdcChecksum);
    if (e === 0n) throw new Error("referrer should have earnings");
  });
  await ok("claimRewards(USDC) by account2", () => reg.connect(account2).claimRewards(usdcChecksum, account2.address));
  await ok("earnings(account2, USDC) === 0 after claim", async () => {
    const e = await reg.earnings(account2.address, usdcChecksum);
    if (e !== 0n) throw new Error(`expected 0 got ${e}`);
  });

  console.log("\n--- FeeManager withdrawToTreasury ---");
  const usdcContract = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)", "function transfer(address,uint256) returns (bool)"],
    usdcChecksum
  );
  const ownerUsdc = await usdcContract.balanceOf(owner.address);
  const withdrawAmount = ownerUsdc > 1000n ? 1000n : ownerUsdc;
  if (withdrawAmount > 0n) {
    await ok("owner sends USDC to FeeManager", async () =>
      usdcContract.connect(owner).transfer(await fm.getAddress(), withdrawAmount)
    );
    await ok("withdrawToTreasury(USDC, amount) to owner", () =>
      fm.connect(owner).withdrawToTreasury(usdcChecksum, withdrawAmount)
    );
  } else {
    console.log("  (skip withdrawToTreasury: no USDC to send to FeeManager)");
  }

  console.log("\n--- Done: all functions tested on local node ---\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
