import { simulateRawTx } from "./index.js";

describe("Simulator", () => {
  it("returns failure for invalid raw tx", async () => {
    const provider = {
      call: async () => { throw new Error("execution reverted"); },
      estimateGas: async () => 200000n,
    } as any;
    const r = await simulateRawTx(provider, "0x02f8b3820a4580843b9aca00843b9aca00830130b8094abcd0000000000000000000000000000000000000080a4");
    expect(r.success).toBe(false);
    expect(r.reverted === true || r.revertReason != null).toBe(true);
  });

  it("returns success when provider call, estimateGas and getBlock succeed", async () => {
    const provider = {
      call: async () => "0x",
      estimateGas: async () => 250000n,
      getBlock: async () => ({ baseFeePerGas: 100n * 10n ** 9n }),
    } as any;
    const { ethers } = await import("ethers");
    const wallet = new ethers.Wallet("0x0000000000000000000000000000000000000000000000000000000000000001");
    const tx = await wallet.signTransaction({
      type: 2,
      chainId: 42161,
      nonce: 0,
      maxPriorityFeePerGas: 2n * 10n ** 8n,
      maxFeePerGas: 100n * 10n ** 9n,
      gasLimit: 200000n,
      to: "0x0000000000000000000000000000000000000001",
      value: 0n,
      data: "0x",
    });
    const r = await simulateRawTx(provider, tx!);
    expect(r.success).toBe(true);
    expect(r.gasEstimate).toBe(250000n);
  });
});
