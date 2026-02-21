import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { WalletAuthorization } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("WalletAuthorization", function () {
  const DELEGATE_AUTHORIZATION_TYPEHASH = ethers.keccak256(
    ethers.toUtf8Bytes("DelegateAuthorization(address owner,address delegate,uint256 nonce,uint256 deadline)")
  );

  async function deployFixture() {
    const [owner, delegate, other] = await ethers.getSigners();
    const WalletAuthorizationFactory = await ethers.getContractFactory("WalletAuthorization");
    const wa = await WalletAuthorizationFactory.deploy();
    return { wa, owner, delegate, other };
  }

  function getDomain(chainId: number, contractAddress: string) {
    return {
      name: "ArbiExecutionLayer",
      version: "1",
      chainId,
      verifyingContract: contractAddress,
    };
  }

  async function signDelegateAuth(
    signer: SignerWithAddress,
    owner: string,
    delegate: string,
    nonce: bigint,
    deadline: bigint,
    wa: WalletAuthorization
  ): Promise<string> {
    const network = await ethers.provider.getNetwork();
    const contractAddress = await (wa as any).getAddress?.() ?? (wa as any).target;
    const domain = getDomain(Number(network.chainId), contractAddress);
    const types = {
      DelegateAuthorization: [
        { name: "owner", type: "address" },
        { name: "delegate", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const value = { owner, delegate, nonce, deadline };
    const signature = await signer.signTypedData(domain, types, value);
    return signature;
  }

  describe("authorizeDelegate", function () {
    it("authorizes delegate with valid EIP-712 signature", async function () {
      const { wa, owner, delegate } = await loadFixture(deployFixture);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const nonce = await wa.nonces(owner.address);
      const sig = await signDelegateAuth(owner, owner.address, delegate.address, nonce, deadline, wa);
      await expect(wa.authorizeDelegate(owner.address, delegate.address, deadline, sig))
        .to.emit(wa, "DelegateAuthorized")
        .withArgs(owner.address, delegate.address);
      expect(await wa.isAuthorized(owner.address, delegate.address)).to.be.true;
      expect(await wa.nonces(owner.address)).to.eq(1);
    });

    it("reverts when deadline expired", async function () {
      const { wa, owner, delegate } = await loadFixture(deployFixture);
      const deadline = 1n; // far in the past
      const nonce = await wa.nonces(owner.address);
      const sig = await signDelegateAuth(owner, owner.address, delegate.address, nonce, deadline, wa);
      await expect(wa.authorizeDelegate(owner.address, delegate.address, deadline, sig))
        .to.be.revertedWithCustomError(wa, "WalletAuthorization__Expired");
    });

    it("reverts when invalid signature", async function () {
      const { wa, owner, delegate, other } = await loadFixture(deployFixture);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const nonce = await wa.nonces(owner.address);
      const sig = await signDelegateAuth(other, owner.address, delegate.address, nonce, deadline, wa);
      await expect(wa.authorizeDelegate(owner.address, delegate.address, deadline, sig))
        .to.be.revertedWithCustomError(wa, "WalletAuthorization__InvalidSignature");
    });

    it("reverts when zero address", async function () {
      const { wa, owner, delegate } = await loadFixture(deployFixture);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const nonce = await wa.nonces(owner.address);
      const sig = await signDelegateAuth(owner, owner.address, delegate.address, nonce, deadline, wa);
      await expect(wa.authorizeDelegate(ethers.ZeroAddress, delegate.address, deadline, sig))
        .to.be.revertedWithCustomError(wa, "WalletAuthorization__ZeroAddress");
    });
  });

  describe("revokeDelegate", function () {
    it("revokes and emits", async function () {
      const { wa, owner, delegate } = await loadFixture(deployFixture);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const nonce = await wa.nonces(owner.address);
      const sig = await signDelegateAuth(owner, owner.address, delegate.address, nonce, deadline, wa);
      await wa.authorizeDelegate(owner.address, delegate.address, deadline, sig);
      await expect(wa.connect(owner).revokeDelegate(delegate.address))
        .to.emit(wa, "DelegateRevoked")
        .withArgs(owner.address, delegate.address);
      expect(await wa.isAuthorized(owner.address, delegate.address)).to.be.false;
    });

    it("reverts on zero delegate", async function () {
      const { wa, owner } = await loadFixture(deployFixture);
      await expect(wa.connect(owner).revokeDelegate(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(wa, "WalletAuthorization__ZeroAddress");
    });
  });

  describe("replay prevention", function () {
    it("reverts when nonce reused", async function () {
      const { wa, owner, delegate } = await loadFixture(deployFixture);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const nonce = await wa.nonces(owner.address);
      const sig = await signDelegateAuth(owner, owner.address, delegate.address, nonce, deadline, wa);
      await wa.authorizeDelegate(owner.address, delegate.address, deadline, sig);
      await expect(wa.authorizeDelegate(owner.address, delegate.address, deadline, sig))
        .to.be.revertedWithCustomError(wa, "WalletAuthorization__InvalidSignature");
    });
  });
});
