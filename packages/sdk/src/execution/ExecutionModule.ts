/**
 * Execution module: swap, quote, approve, and simulation via ExecutionRouter.
 */

import { Contract, ethers, type Provider, type Signer } from "ethers";
import { SignerError, ContractError, ValidationError, SimulationError } from "../errors";
import type { SwapParams, QuoteResult, ExactInputSingleParams } from "../types";
import { EXECUTION_ROUTER_ABI, ERC20_ABI } from "../constants/abis";
import { applySlippageBps } from "../utils/slippage";
import type { AddressConfig } from "../constants/addresses";

export interface ExecutionConfig {
  provider: Provider;
  signer?: Signer | null;
  routerAddress: string;
  addresses?: AddressConfig;
}

export class ExecutionModule {
  private readonly provider: Provider;
  private readonly signer: Signer | null;
  private readonly routerAddress: string;

  constructor(config: ExecutionConfig) {
    this.provider = config.provider;
    this.signer = config.signer ?? null;
    this.routerAddress = config.routerAddress;
  }

  /**
   * Get the ExecutionRouter contract (read-only or with signer).
   */
  private getRouter(): Contract {
    const signerOrProvider = this.signer ?? this.provider;
    return new Contract(this.routerAddress, EXECUTION_ROUTER_ABI, signerOrProvider);
  }

  /**
   * Get current execution nonce for an owner (for replay protection).
   */
  async getExecutionNonce(owner: string): Promise<bigint> {
    const router = this.getRouter();
    return router.executionNonces(owner);
  }

  /**
   * Get router WETH address.
   */
  async getWethAddress(): Promise<string> {
    const router = this.getRouter();
    return router.weth();
  }

  /**
   * Simulate a swap (staticCall) to get expected amountOut without sending a transaction.
   */
  async simulateSwap(params: SwapParams): Promise<QuoteResult> {
    const router = new Contract(this.routerAddress, EXECUTION_ROUTER_ABI, this.provider);
    const { exactInputSingle, deadline, beneficiary, minAmountOutAfterFee } = params;
    const nonce = params.nonce ?? (await router.executionNonces(beneficiary));
    const tuple = this.toExactInputTuple(exactInputSingle);
    try {
      const amountOut = await router.executeExactInputSingle.staticCall(
        tuple,
        deadline,
        beneficiary,
        minAmountOutAfterFee,
        nonce,
        { value: exactInputSingle.tokenIn === (await router.weth()) ? exactInputSingle.amountIn : 0n }
      );
      return {
        amountOut: BigInt(amountOut.toString()),
        amountIn: BigInt(exactInputSingle.amountIn.toString()),
      };
    } catch (err) {
      throw new SimulationError(
        err instanceof Error ? err.message : "Swap simulation failed"
      );
    }
  }

  /**
   * Get a quote by simulating the swap (same as simulateSwap, returns amountOut).
   */
  async getQuote(params: {
    exactInputSingle: ExactInputSingleParams;
    beneficiary: string;
  }): Promise<QuoteResult> {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    const minOut = 0n;
    const swapParams: SwapParams = {
      exactInputSingle: params.exactInputSingle,
      deadline,
      beneficiary: params.beneficiary,
      minAmountOutAfterFee: minOut,
    };
    return this.simulateSwap(swapParams);
  }

  /**
   * Execute exact-input single swap. Requires signer. Optionally pass value for ETH→WETH wrap.
   */
  async swapExactInputSingle(params: SwapParams): Promise<{ amountOut: bigint; txHash: string }> {
    if (!this.signer) throw new SignerError();
    const router = this.getRouter();
    const nonce = params.nonce ?? (await router.executionNonces(params.beneficiary));
    const tuple = this.toExactInputTuple(params.exactInputSingle);
    const isEthIn =
      params.exactInputSingle.tokenIn === (await router.weth());
    const value = isEthIn ? BigInt(params.exactInputSingle.amountIn.toString()) : 0n;
    try {
      const tx = await router.executeExactInputSingle(
        tuple,
        params.deadline,
        params.beneficiary,
        params.minAmountOutAfterFee,
        nonce,
        { value }
      );
      const receipt = await tx.wait();
      const amountOut = receipt?.logs
        ? await this.parseAmountOutFromLogs(receipt.logs)
        : 0n;
      return { amountOut, txHash: receipt?.hash ?? tx.hash };
    } catch (err) {
      throw new ContractError(
        err instanceof Error ? err.message : "Swap failed",
        err && typeof err === "object" && "hash" in err ? (err as { hash: string }).hash : undefined
      );
    }
  }

  /**
   * Swap with slippage: computes minAmountOutAfterFee from quote and slippageBps.
   */
  async swapExactInputSingleWithSlippage(
    params: Omit<SwapParams, "minAmountOutAfterFee"> & { slippageBps: number }
  ): Promise<{ amountOut: bigint; txHash: string }> {
    const quote = await this.simulateSwap({
      ...params,
      minAmountOutAfterFee: 0n,
    });
    const minOut = applySlippageBps(quote.amountOut, params.slippageBps);
    return this.swapExactInputSingle({
      ...params,
      minAmountOutAfterFee: minOut,
    });
  }

  /**
   * Approve token spend for the router (or another spender).
   */
  async approveToken(
    tokenAddress: string,
    amount: bigint,
    spender?: string
  ): Promise<{ txHash: string }> {
    if (!this.signer) throw new SignerError();
    const spenderAddress = spender ?? this.routerAddress;
    const token = new Contract(tokenAddress, ERC20_ABI, this.signer);
    const tx = await token.approve(spenderAddress, amount);
    const receipt = await tx.wait();
    return { txHash: receipt?.hash ?? tx.hash };
  }

  /**
   * Estimate gas for a swap (optional).
   */
  async estimateSwapGas(params: SwapParams): Promise<bigint> {
    if (!this.signer) throw new SignerError();
    const router = this.getRouter();
    const nonce = params.nonce ?? (await router.executionNonces(params.beneficiary));
    const tuple = this.toExactInputTuple(params.exactInputSingle);
    const isEthIn =
      params.exactInputSingle.tokenIn === (await router.weth());
    const value = isEthIn ? BigInt(params.exactInputSingle.amountIn.toString()) : 0n;
    const gas = await router.executeExactInputSingle.estimateGas(
      tuple,
      params.deadline,
      params.beneficiary,
      params.minAmountOutAfterFee,
      nonce,
      { value }
    );
    return BigInt(gas.toString());
  }

  /** ExactOutput single is not implemented on this router; use exactInput. */
  async swapExactOutputSingle(_params: unknown): Promise<never> {
    throw new ValidationError("ExecutionRouter supports only exactInputSingle");
  }

  /** User trades would require indexing events; return empty for now. */
  async getUserTrades(_address: string): Promise<Array<{ txHash: string; amountIn: bigint; amountOut: bigint }>> {
    return [];
  }

  private toExactInputTuple(p: ExactInputSingleParams): [
    [string, string, number, string, bigint, bigint, bigint]
  ] {
    const sqrtLimit = p.sqrtPriceLimitX96 != null
      ? BigInt(p.sqrtPriceLimitX96.toString())
      : 0n;
    return [[
      ethers.getAddress(p.tokenIn),
      ethers.getAddress(p.tokenOut),
      p.fee,
      ethers.getAddress(p.recipient),
      BigInt(p.amountIn.toString()),
      BigInt(p.amountOutMinimum.toString()),
      sqrtLimit,
    ]];
  }

  private async parseAmountOutFromLogs(logs: Array<{ topics: string[]; data: string }>): Promise<bigint> {
    for (const log of logs) {
      if (log.data && log.data.length >= 66) {
        return BigInt(log.data);
      }
    }
    return 0n;
  }
}
