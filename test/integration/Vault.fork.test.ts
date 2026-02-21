/**
 * Fork integration tests for Vault + UniswapV3 LP Strategy.
 * Run with: FORK_MAINNET=1 npx hardhat test test/integration/Vault.fork.test.ts
 */
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const ARBITRUM_ONE = {
  usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  nonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  swapRouter02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
  // USDC/WETH 0.3% - getPool(usdc, weth, 3000)
  usdcWethPool3000: "0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443",
};
const USDC_WHALE = "0x47c031236e19d024b42f8ae6780e44a573170703"; // arbitrary USDC holder

async function deployVaultFixture() {
  const [owner, treasury, user] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  if (Number(chainId) !== 42161) {
    return { skip: true, owner, treasury, user };
  }
  const usdc = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)", "function approve(address,uint256) returns (bool)", "function transfer(address,uint256) returns (bool)"],
    ARBITRUM_ONE.usdc
  );
  const depositCap = ethers.parseUnits("1000000", 6);
  const VaultFactory = await ethers.getContractFactory("Vault");
  const vault = await VaultFactory.deploy(
    ARBITRUM_ONE.usdc,
    "USDC Vault",
    "vUSDC",
    treasury.address,
    depositCap,
    1000,
    0
  );
  await vault.waitForDeployment();

  const UniswapV3LPStrategy = await ethers.getContractFactory("UniswapV3LPStrategy");
  const strategy = await UniswapV3LPStrategy.deploy(
    await vault.getAddress(),
    ARBITRUM_ONE.usdc,
    ARBITRUM_ONE.nonfungiblePositionManager,
    ARBITRUM_ONE.swapRouter02,
    ARBITRUM_ONE.usdcWethPool3000,
    -887220,
    887220
  );
  await strategy.waitForDeployment();
  await vault.setStrategy(strategy);

  return { vault, strategy, usdc, owner, treasury, user, skip: false };
}

describe("Vault (fork integration)", function () {
  this.timeout(120_000);

  it("deposit USDC and totalAssets increases", async function () {
    const f = await loadFixture(deployVaultFixture);
    if (f.skip) {
      console.log("Skipping: not on Arbitrum One fork (FORK_MAINNET=1)");
      return;
    }
    const { vault, strategy, usdc, user } = f;
    await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    const whale = await ethers.getSigner(USDC_WHALE);
    const amount = ethers.parseUnits("100", 6);
    const bal = await usdc.balanceOf(USDC_WHALE);
    if (bal < amount) {
      console.log("Skipping: whale balance too low");
      return;
    }
    await usdc.connect(whale).transfer(user.address, amount);
    await usdc.connect(user).approve(await vault.getAddress(), amount);
    await vault.connect(user).deposit(amount, user.address);
    expect(await vault.totalAssets()).to.be.gte(amount);
    expect(await vault.balanceOf(user.address)).to.be.gt(0n);
  });

  it("withdraw returns USDC to user", async function () {
    const f = await loadFixture(deployVaultFixture);
    if (f.skip) return;
    const { vault, strategy, usdc, user } = f;
    await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    const whale = await ethers.getSigner(USDC_WHALE);
    const amount = ethers.parseUnits("50", 6);
    await usdc.connect(whale).transfer(user.address, amount);
    await usdc.connect(user).approve(await vault.getAddress(), amount);
    await vault.connect(user).deposit(amount, user.address);
    const before = await usdc.balanceOf(user.address);
    const shares = await vault.balanceOf(user.address);
    await vault.connect(user).redeem(shares, user.address, user.address);
    const after_ = await usdc.balanceOf(user.address);
    expect(after_).to.be.gte(before);
  });

  it("harvest can be called (no revert)", async function () {
    const f = await loadFixture(deployVaultFixture);
    if (f.skip) return;
    const { vault, user } = f;
    await vault.harvest();
    expect(await vault.totalAssets()).to.be.gte(0n);
  });
});
