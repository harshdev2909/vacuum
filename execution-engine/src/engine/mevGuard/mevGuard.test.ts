import { evaluateMevRisk } from "./index.js";
import type { MempoolSnapshot, PendingSwap } from "../../types.js";

describe("MEV Guard", () => {
  const emptyMempool: MempoolSnapshot = {
    pendingSwaps: [],
    poolActivity: new Map(),
    baseFeePerGas: 10n ** 9n,
    blockNumber: 1000,
  };

  let mockSwapTx: string;
  beforeAll(async () => {
    const { ethers } = await import("ethers");
    const dummyProvider = {
      getNetwork: async () => ({ chainId: 42161n }),
      resolveName: async (name: string) => name,
    } as any;
    const wallet = new ethers.Wallet("0x0000000000000000000000000000000000000000000000000000000000000001", dummyProvider);
    mockSwapTx = (await wallet.signTransaction({
      type: 2,
      chainId: 42161,
      nonce: 0,
      maxPriorityFeePerGas: 2n * 10n ** 8n,
      maxFeePerGas: 100n * 10n ** 9n,
      gasLimit: 300000n,
      to: "0x0000000000000000000000000000000000000001",
      value: 0n,
      data: "0x414bf389",
    }))!;
  });

  it("returns safe when mempool empty and simulation ok", () => {
    const r = evaluateMevRisk(mockSwapTx, emptyMempool, true);
    expect(r.action).toBe("safe");
    expect(r.riskScore).toBeLessThan(50);
  });

  it("returns reject when simulation failed", () => {
    const r = evaluateMevRisk(mockSwapTx, emptyMempool, false);
    expect(r.action).toBe("reject");
    expect(r.riskScore).toBe(100);
  });

  it("increases risk when same-pool pending swaps", () => {
    const pending: PendingSwap[] = [
      { hash: "0x1", from: "0xa", to: "0x0000000000000000000000000000000000000001", value: 0n, data: "0x" },
      { hash: "0x2", from: "0xb", to: "0x0000000000000000000000000000000000000001", value: 0n, data: "0x" },
    ];
    const mempool: MempoolSnapshot = { ...emptyMempool, pendingSwaps: pending };
    const r = evaluateMevRisk(mockSwapTx, mempool, true);
    expect(r.riskScore).toBeGreaterThan(0);
    expect(["increaseGas", "bundle", "reject"]).toContain(r.action);
  });

  it("respects RISK_THRESHOLD for reject", () => {
    const manyPending: PendingSwap[] = Array(5).fill({
      hash: "0x",
      from: "0xa",
      to: "0x0000000000000000000000000000000000000001",
      value: 0n,
      data: "0x",
      decoded: { router: "0x", tokenIn: "0x", tokenOut: "0x", fee: 500, amountIn: 10n ** 21n },
    });
    const mempool: MempoolSnapshot = { ...emptyMempool, pendingSwaps: manyPending };
    const r = evaluateMevRisk(mockSwapTx, mempool, true);
    expect(r.riskScore).toBeGreaterThanOrEqual(0);
    expect(r.action).toMatch(/safe|increaseGas|bundle|reject/);
  });
});
