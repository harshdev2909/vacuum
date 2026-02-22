import { broadcastSingle } from "./index.js";

describe("Bundler", () => {
  it("broadcastSingle returns error on invalid raw tx", async () => {
    const provider = { broadcastTransaction: async () => { throw new Error("invalid"); } } as any;
    const r = await broadcastSingle(provider, "0xinvalid");
    expect(r.success).toBe(false);
    expect(r.error).toBeDefined();
  });

  it("broadcastSingle returns success when provider resolves", async () => {
    const provider = {
      broadcastTransaction: async () => ({ hash: "0xabc123" }),
    } as any;
    const r = await broadcastSingle(provider, "0x02f8b3820a4580843b9aca00843b9aca00830130b8094abcd0000000000000000000000000000000000000080a4");
    expect(r.success).toBe(true);
    expect(r.txHash).toBe("0xabc123");
  });
});
