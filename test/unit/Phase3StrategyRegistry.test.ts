import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { StrategyRegistry } from "../../typechain-types";
import { StrategyNFT } from "../../typechain-types";

async function deployFixture() {
  const [owner, creator, other] = await ethers.getSigners();
  const StrategyRegistryFactory = await ethers.getContractFactory("StrategyRegistry");
  const registry = await StrategyRegistryFactory.deploy();
  await registry.waitForDeployment();
  const StrategyNFTFactory = await ethers.getContractFactory("StrategyNFT");
  const nft = await StrategyNFTFactory.deploy(500);
  await nft.waitForDeployment();
  await registry.setStrategyNFT(await nft.getAddress());
  await nft.setRegistry(await registry.getAddress());
  const strategyAddr = "0x0000000000000000000000000000000000000001";
  await registry.register(strategyAddr, creator.address, 1, 2, ethers.zeroPadBytes("0x01", 32), "ipfs://meta1");
  return { registry, nft, owner, creator, other, strategyAddr };
}

describe("StrategyRegistry", function () {
  it("only creator can upgrade", async function () {
    const { registry, nft, creator, other, strategyAddr } = await loadFixture(deployFixture);
    await expect(registry.connect(other).upgradeStrategy(strategyAddr, 2, ethers.zeroPadBytes("0x02", 32)))
      .to.be.revertedWithCustomError(registry, "StrategyRegistry__NotCreator");
    await registry.connect(creator).upgradeStrategy(strategyAddr, 2, ethers.zeroPadBytes("0x02", 32));
    expect(await registry.getActiveVersion(strategyAddr)).to.eq(2n);
    expect(await nft.versionByToken(1)).to.eq(2n);
  });

  it("isActiveVersion returns true only for current version", async function () {
    const { registry, strategyAddr } = await loadFixture(deployFixture);
    expect(await registry.isActiveVersion(strategyAddr, 1)).to.be.true;
    expect(await registry.isActiveVersion(strategyAddr, 2)).to.be.false;
  });

  it("reverts when registering same strategy twice", async function () {
    const { registry, creator, strategyAddr } = await loadFixture(deployFixture);
    await expect(
      registry.register(strategyAddr, creator.address, 1, 2, ethers.zeroPadBytes("0x01", 32), "uri2")
    ).to.be.revertedWithCustomError(registry, "StrategyRegistry__AlreadyRegistered");
  });
});
