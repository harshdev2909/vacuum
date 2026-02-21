import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { StrategyNFT } from "../../typechain-types";
import { StrategyRegistry } from "../../typechain-types";

async function deployFixture() {
  const [owner, creator, user] = await ethers.getSigners();
  const StrategyRegistryFactory = await ethers.getContractFactory("StrategyRegistry");
  const registry = await StrategyRegistryFactory.deploy();
  await registry.waitForDeployment();

  const StrategyNFTFactory = await ethers.getContractFactory("StrategyNFT");
  const nft = await StrategyNFTFactory.deploy(500); // 5% royalty
  await nft.waitForDeployment();

  await registry.setStrategyNFT(await nft.getAddress());
  await nft.setRegistry(await registry.getAddress());

  return { nft, registry, owner, creator, user };
}

describe("StrategyNFT", function () {
  it("mints when registry registers strategy and emits StrategyMinted", async function () {
    const { nft, registry, owner, creator } = await loadFixture(deployFixture);
    const strategyAddr = "0x0000000000000000000000000000000000000001";
    const tx = await registry.register(
      strategyAddr,
      creator.address,
      1, // Execution
      2, // risk level
      ethers.zeroPadBytes("0x01", 32),
      "ipfs://meta1"
    );
    await expect(tx).to.emit(nft, "StrategyMinted").withArgs(1n, strategyAddr, creator.address, 1n, "ipfs://meta1");
    expect(await nft.ownerOf(1)).to.eq(creator.address);
    expect(await nft.strategyByToken(1)).to.eq(strategyAddr);
    expect(await nft.versionByToken(1)).to.eq(1n);
    expect(await nft.creatorByToken(1)).to.eq(creator.address);
  });

  it.skip("setVersion only callable by registry", async function () {
    const { nft, registry, creator } = await loadFixture(deployFixture);
    await registry.register("0x0000000000000000000000000000000000000001", creator.address, 1, 2, ethers.zeroPadBytes("0x01", 32), "uri");
    await nft.setVersion(1, 2);
    expect(await nft.versionByToken(1)).to.eq(2n);
    await expect(nft.connect(creator).setVersion(1, 3)).to.be.reverted;
  });

  it("royaltyInfo returns creator and 5% of sale price", async function () {
    const { nft, registry, creator } = await loadFixture(deployFixture);
    await registry.register("0x0000000000000000000000000000000000000001", creator.address, 1, 2, ethers.zeroPadBytes("0x01", 32), "uri");
    const [receiver, amount] = await nft.royaltyInfo(1, ethers.parseEther("1"));
    expect(receiver).to.eq(creator.address);
    expect(amount).to.eq(ethers.parseEther("0.05"));
  });
});
