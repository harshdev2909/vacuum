import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { RoyaltyDistributor } from "../../typechain-types";
import { TestERC20 } from "../../typechain-types";

async function deployFixture() {
  const [owner, treasury, creator, affiliate] = await ethers.getSigners();
  const RoyaltyDistributorFactory = await ethers.getContractFactory("RoyaltyDistributor");
  const distributor = await RoyaltyDistributorFactory.deploy(treasury.address, 500, 300, 200); // 5% creator, 3% protocol, 2% affiliate
  await distributor.waitForDeployment();

  const TestERC20Factory = await ethers.getContractFactory("TestERC20");
  const token = await TestERC20Factory.deploy("Pay", "PAY", 18);
  await token.waitForDeployment();
  await token.mint(owner.address, ethers.parseEther("1000"));
  await token.connect(owner).approve(await distributor.getAddress(), ethers.MaxUint256);

  return { distributor, token, owner, treasury, creator, affiliate };
}

describe("RoyaltyDistributor", function () {
  it("splits payment and updates claimable", async function () {
    const { distributor, token, treasury, creator, affiliate } = await loadFixture(deployFixture);
    const amount = ethers.parseEther("100");
    await distributor.receivePayment(await token.getAddress(), creator.address, affiliate.address, amount);
    expect(await distributor.claimable(creator.address, await token.getAddress())).to.eq(ethers.parseEther("5"));
    expect(await distributor.claimable(treasury.address, await token.getAddress())).to.eq(ethers.parseEther("3"));
    expect(await distributor.claimable(affiliate.address, await token.getAddress())).to.eq(ethers.parseEther("2"));
  });

  it("claim transfers balance and zeros claimable", async function () {
    const { distributor, token, creator } = await loadFixture(deployFixture);
    await distributor.receivePayment(await token.getAddress(), creator.address, ethers.ZeroAddress, ethers.parseEther("100"));
    const before = await token.balanceOf(creator.address);
    await distributor.connect(creator).claim(await token.getAddress());
    expect(await token.balanceOf(creator.address)).to.eq(before + ethers.parseEther("5"));
    expect(await distributor.claimable(creator.address, await token.getAddress())).to.eq(0n);
  });

  it("emits RoyaltyPaid", async function () {
    const { distributor, token, creator, affiliate } = await loadFixture(deployFixture);
    await expect(
      distributor.receivePayment(await token.getAddress(), creator.address, affiliate.address, ethers.parseEther("100"))
    )
      .to.emit(distributor, "RoyaltyPaid")
      .withArgs(await token.getAddress(), creator.address, affiliate.address, ethers.parseEther("5"), ethers.parseEther("3"), ethers.parseEther("2"));
  });
});
