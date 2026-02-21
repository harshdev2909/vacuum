// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IV3SwapRouter } from "../interfaces/IV3SwapRouter.sol";

/// @notice Mock Uniswap V3 router for unit tests: pulls tokenIn, sends tokenOut, returns configured amountOut
contract MockV3Router {
    using SafeERC20 for IERC20;

    uint256 public mockAmountOut = 1e18;
    uint256 public mockAmountIn;

    function setMockAmountOut(uint256 amountOut) external {
        mockAmountOut = amountOut;
    }

    function exactInputSingle(IV3SwapRouter.ExactInputSingleParams calldata params) external payable returns (uint256) {
        mockAmountIn = params.amountIn;
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        IERC20(params.tokenOut).forceApprove(msg.sender, 0);
        IERC20(params.tokenOut).forceApprove(msg.sender, mockAmountOut);
        IERC20(params.tokenOut).transfer(params.recipient, mockAmountOut);
        return mockAmountOut;
    }

    address public mockExactInputTokenOut;

    function setMockExactInputTokenOut(address token) external {
        mockExactInputTokenOut = token;
    }

    function exactInput(IV3SwapRouter.ExactInputParams calldata params) external payable returns (uint256) {
        mockAmountIn = params.amountIn;
        require(mockExactInputTokenOut != address(0), "set token");
        IERC20(mockExactInputTokenOut).transfer(params.recipient, mockAmountOut);
        return mockAmountOut;
    }

    function exactOutputSingle(IV3SwapRouter.ExactOutputSingleParams calldata params) external payable returns (uint256) {
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountInMaximum);
        IERC20(params.tokenOut).transfer(params.recipient, params.amountOut);
        mockAmountIn = params.amountInMaximum; // mock: assume we use max
        return params.amountInMaximum;
    }

    address public mockExactOutputTokenOut;
    address public mockExactOutputTokenIn;

    function setMockExactOutputTokenOut(address token) external {
        mockExactOutputTokenOut = token;
    }

    function setMockExactOutputTokenIn(address token) external {
        mockExactOutputTokenIn = token;
    }

    function exactOutput(IV3SwapRouter.ExactOutputParams calldata params) external payable returns (uint256) {
        require(mockExactOutputTokenOut != address(0) && mockExactOutputTokenIn != address(0), "set tokens");
        IERC20(mockExactOutputTokenIn).transferFrom(msg.sender, address(this), params.amountInMaximum);
        IERC20(mockExactOutputTokenOut).transfer(params.recipient, params.amountOut);
        return params.amountInMaximum;
    }

    function depositToken(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }
}
