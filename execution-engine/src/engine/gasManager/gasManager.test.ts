import { getGasRecommendation, buildReplaceTxGasParams } from "./index.js";

describe("Gas Manager", () => {
  const mockProvider = {
    getBlock: async () => ({
      baseFeePerGas: 100n * 10n ** 9n,
      number: 1000,
    }),
  } as any;

  it("returns positive maxFeePerGas and maxPriorityFeePerGas", async () => {
    const r = await getGasRecommendation(mockProvider, 0, 0);
    expect(r.maxFeePerGas > 0n).toBe(true);
    expect(r.maxPriorityFeePerGas > 0n).toBe(true);
    expect(r.gasLimit).toBe(800000n);
  });

  it("increases recommendation with risk score", async () => {
    const low = await getGasRecommendation(mockProvider, 0, 0);
    const high = await getGasRecommendation(mockProvider, 80, 0);
    expect(high.maxFeePerGas >= low.maxFeePerGas).toBe(true);
  });

  it("buildReplaceTxGasParams escalates gas", () => {
    const currentMax = 100n * 10n ** 9n;
    const currentPri = 2n * 10n ** 8n;
    const { maxFeePerGas, maxPriorityFeePerGas } = buildReplaceTxGasParams(
      currentMax,
      currentPri,
      1.25
    );
    expect(maxFeePerGas).toBe((currentMax * 125n) / 100n);
    expect(maxPriorityFeePerGas).toBe((currentPri * 125n) / 100n);
  });
});
