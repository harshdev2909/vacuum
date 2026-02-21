// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IV3SwapRouter } from "./IV3SwapRouter.sol";

/// @title Minimal interface for ExecutionRouter used by TreasuryAutomationController
interface IExecutionRouter {
    function executeExactInputSingle(
        IV3SwapRouter.ExactInputSingleParams calldata params,
        uint256 deadline,
        address beneficiary,
        uint256 minAmountOutAfterFee,
        uint256 nonce
    ) external payable returns (uint256 amountOut);

    function executionNonces(address owner) external view returns (uint256);
}
