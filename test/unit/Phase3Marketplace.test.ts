import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { StrategyNFT } from "../../typechain-types";
import { StrategyRegistry } from "../../typechain-types";
import { RoyaltyDistributor } from "../../typechain-types";
import { StrategyMarketplace } from "../../typechain-types";
import { TestERC20 } from "../../typechain-types";

async function deployFixture() {
  const [owner, creator, seller, buyer] = await ethers.getSigners();
  const StrategyRegistryFactory = await ethers.getContractFactory("StrategyRegistry");
  const registry = await StrategyRegistryFactory.deploy();
  await registry.waitForDeployment();
  const StrategyNFTFactory = await ethers.getContractFactory("StrategyNFT");
  const nft = await StrategyNFTFactory.deploy(500);
  await nft.waitForDeployment();
  await registry.setStrategyNFT(await nft.getAddress());
  await nft.setRegistry(await registry.getAddress());

  const RoyaltyDistributorFactory = await ethers.getContractFactory("RoyaltyDistributor");
  const distributor = await RoyaltyDistributorFactory.deploy(owner.address, 500, 300, 200);
  await distributor.waitForDeployment();

  const MarketplaceFactory = await ethers.getContractFactory("StrategyMarketplace");
  const marketplace = await MarketplaceFactory.deploy(await nft.getAddress(), await distributor.getAddress());
  await marketplace.waitForDeployment();

  await registry.register("0x0000000000000000000000000000000000000001", creator.address, 1, 2, ethers.zeroPadBytes("0x01", 32), "uri");
  const tokenId = 1n;
  await nft.connect(creator).approve(await marketplace.getAddress(), tokenId);

  const TestERC20Factory = await ethers.getContractFactory("TestERC20");
  const payToken = await TestERC20Factory.deploy("Pay", "PAY", 18);
  await payToken.waitForDeployment();
  await payToken.mint(buyer.address, ethers.parseEther("100"));
  await payToken.connect(buyer).approve(await marketplace.getAddress(), ethers.MaxUint256);

  return { nft, registry, distributor, marketplace, payToken, owner, creator, seller, buyer, tokenId };
}

describe("StrategyMarketplace", function () {
  it("list and buy: transfer NFT, distribute royalties, emit ListingSold", async function () {
    const { nft, marketplace, distributor, payToken, creator, buyer, tokenId } = await loadFixture(deployFixture);
    const price = ethers.parseEther("10");
    await marketplace.connect(creator).list(tokenId, await payToken.getAddress(), price);
    const royaltyBefore = await distributor.claimable(creator.address, await payToken.getAddress());
    const royaltyAmount = (price * 500n) / 10000n; // 5% NFT royalty
    const creatorShare = (royaltyAmount * 500n) / 10000n; // 5% of royalty to creator

    await marketplace.connect(buyer).buy(tokenId, ethers.ZeroAddress);

    expect(await nft.ownerOf(tokenId)).to.eq(buyer.address);
    expect(await distributor.claimable(creator.address, await payToken.getAddress())).to.eq(royaltyBefore + creatorShare);
    const [, , p] = await marketplace.getListing(tokenId);
    expect(p).to.eq(0n);
  });

  it("prevents replay purchase: listing removed after buy", async function () {
    const { marketplace, payToken, creator, buyer, tokenId } = await loadFixture(deployFixture);
    await marketplace.connect(creator).list(tokenId, await payToken.getAddress(), ethers.parseEther("10"));
    await marketplace.connect(buyer).buy(tokenId, ethers.ZeroAddress);
    await expect(marketplace.connect(buyer).buy(tokenId, ethers.ZeroAddress)).to.be.revertedWithCustomError(marketplace, "StrategyMarketplace__NotListed");
  });

  it("only seller can cancel listing", async function () {
    const { marketplace, payToken, creator, buyer, tokenId } = await loadFixture(deployFixture);
    await marketplace.connect(creator).list(tokenId, await payToken.getAddress(), ethers.parseEther("10"));
    await expect(marketplace.connect(buyer).cancelListing(tokenId)).to.be.revertedWithCustomError(marketplace, "StrategyMarketplace__NotSeller");
    await marketplace.connect(creator).cancelListing(tokenId);
    const [seller] = await marketplace.getListing(tokenId);
    expect(seller).to.eq(ethers.ZeroAddress);
  });
});
