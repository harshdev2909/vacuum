import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { VaultFactory } from "../../typechain-types";
import { Vault } from "../../typechain-types";
import { TestERC20 } from "../../typechain-types";

async function deployFixture() {
  const [owner, treasury] = await ethers.getSigners();
  const VaultFactoryContract = await ethers.getContractFactory("VaultFactory");
  const factory = await VaultFactoryContract.deploy();
  await factory.waitForDeployment();

  const TestERC20Factory = await ethers.getContractFactory("TestERC20");
  const asset = await TestERC20Factory.deploy("Test USDC", "USDC", 6);
  await asset.waitForDeployment();
  return { factory, asset, owner, treasury };
}

describe("VaultFactory", function () {
  describe("createVault", function () {
    it("deploys vault and tracks it", async function () {
      const { factory, asset, treasury } = await loadFixture(deployFixture);
      const cap = ethers.parseUnits("1000000", 6);
      const tx = await factory.createVault(
        await asset.getAddress(),
        "Test Vault",
        "vUSDC",
        treasury.address,
        cap,
        1000,
        0
      );
      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);
      expect(await factory.vaultCount()).to.eq(1n);
      const vaultAddr = await factory.getVaultAt(0);
      expect(await factory.isVault(vaultAddr)).to.be.true;
      const Vault = await ethers.getContractAt("Vault", vaultAddr);
      expect(await Vault.asset()).to.eq(await asset.getAddress());
      expect(await Vault.treasury()).to.eq(treasury.address);
    });

    it("emits VaultCreated", async function () {
      const { factory, asset, treasury } = await loadFixture(deployFixture);
      const cap = ethers.parseUnits("1000000", 6);
      await expect(
        factory.createVault(
          await asset.getAddress(),
          "V",
          "v",
          treasury.address,
          cap,
          1000,
          0
        )
      )
        .to.emit(factory, "VaultCreated")
        .withArgs(
          (value: string) => value.length === 42,
          ethers.ZeroAddress,
          await asset.getAddress(),
          "V",
          "v",
          treasury.address
        );
    });

    it("reverts when not owner", async function () {
      const { factory, asset, treasury } = await loadFixture(deployFixture);
      const [, , user] = await ethers.getSigners();
      const cap = ethers.parseUnits("1000000", 6);
      await expect(
        factory.connect(user).createVault(
          await asset.getAddress(),
          "V",
          "v",
          treasury.address,
          cap,
          1000,
          0
        )
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
  });
});
