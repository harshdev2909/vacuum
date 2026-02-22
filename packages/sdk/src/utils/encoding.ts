/**
 * Encoding helpers for rule IDs, agent IDs, and payloads.
 */

import { ethers } from "ethers";

/**
 * Encode a string or bytes32 as rule ID (bytes32).
 */
export function toRuleId(id: string): string {
  if (id.startsWith("0x") && id.length === 66) return id;
  return ethers.id(id);
}

/**
 * Encode a string as agent ID (bytes32).
 */
export function toAgentId(id: string): string {
  if (id.startsWith("0x") && id.length === 66) return id;
  return ethers.id(id);
}

/**
 * Encode execution payload as hex bytes.
 */
export function encodePayload(data: string | Uint8Array): string {
  if (typeof data === "string") {
    return data.startsWith("0x") ? data : ethers.toBeHex(data);
  }
  return ethers.hexlify(data);
}
