/**
 * Execution signer: build and sign EIP-712 execution messages for delegated execution.
 * Does not hold private keys; uses the SDK's signer (wallet) for signing.
 */

import { TypedDataEncoder, type Signer } from "ethers";
import type { ArbiClient } from "vacuum-sdk";
import type { TypedExecutionData } from "./types";

export interface ExecutionSignerConfig {
  client: ArbiClient;
}

/**
 * Prepares and signs structured execution messages (EIP-712).
 * Used by agents to produce signatures for delegate execution or off-chain approval.
 */
export class ExecutionSigner {
  private readonly client: ArbiClient;

  constructor(config: ExecutionSignerConfig) {
    this.client = config.client;
  }

  /**
   * Sign typed data (EIP-712). Requires client.signer.
   */
  async signTypedData(data: TypedExecutionData): Promise<string> {
    const signer = this.client.signer;
    if (!signer) {
      throw new Error("ExecutionSigner: signer required");
    }
    const signature = await signer.signTypedData(
      data.domain,
      data.types,
      data.message
    );
    return signature;
  }

  /**
   * Hash typed data without signing (for verification or replay checks).
   */
  hashTypedData(data: TypedExecutionData): string {
    return TypedDataEncoder.hash(
      data.domain,
      data.types,
      data.message
    );
  }

  /**
   * Build domain for Vacuum WalletAuth / execution (example structure).
   */
  static buildDomain(chainId: number, verifyingContract: string): TypedExecutionData["domain"] {
    return {
      name: "VacuumExecution",
      version: "1",
      chainId,
      verifyingContract,
    };
  }
}
