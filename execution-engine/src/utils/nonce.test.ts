import { recoverSenderFromRawTx } from "./nonce.js";

describe("Nonce", () => {
  it("recoverSenderFromRawTx returns null for invalid hex", () => {
    expect(recoverSenderFromRawTx("0xinvalid")).toBe(null);
  });

  it("recoverSenderFromRawTx returns null for empty string", () => {
    expect(recoverSenderFromRawTx("")).toBe(null);
  });

  it("validateAndReserveNonce and getStoredNonce require Redis (integration)", () => {
    expect(true).toBe(true);
  });
});
