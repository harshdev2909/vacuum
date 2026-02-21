// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IExecutionRouter } from "../interfaces/IExecutionRouter.sol";
import { IV3SwapRouter } from "../interfaces/IV3SwapRouter.sol";

/// @title BuybackModule
/// @notice Scheduled buybacks with TWAP-style chunking, max gas limit, and treasury balance check
contract BuybackModule is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    error BuybackModule__ZeroAddress();
    error BuybackModule__InsufficientTreasuryBalance();
    error BuybackModule__GasLimitExceeded();
    error BuybackModule__ScheduleNotFound();
    error BuybackModule__NotYetTime();
    error BuybackModule__ChunksExhausted();
    error BuybackModule__ExecutionFailed();

    event BuybackScheduleCreated(
        bytes32 indexed scheduleId,
        address paymentToken,
        address tokenToBuy,
        uint256 totalAmount,
        uint256 chunks,
        uint256 intervalSeconds,
        uint256 maxGasLimit
    );
    event BuybackChunkExecuted(bytes32 indexed scheduleId, uint256 chunkIndex, uint256 amountIn, uint256 amountOut);
    event BuybackScheduleCancelled(bytes32 indexed scheduleId);
    event TreasurySet(address indexed treasury);
    event ExecutionRouterSet(address indexed router);

    struct BuybackSchedule {
        bool exists;
        bool cancelled;
        address treasury;
        address paymentToken;
        address tokenToBuy;
        uint256 totalAmount;
        uint256 chunks;
        uint256 intervalSeconds;
        uint256 maxGasLimit;
        uint256 chunksExecuted;
        uint256 nextExecutionTime;
        uint256 lastChunkAt;
    }

    address public treasury;
    IExecutionRouter public executionRouter;
    mapping(bytes32 => BuybackSchedule) public schedules;
    bytes32[] private _scheduleIds;

    constructor(address owner_) Ownable(owner_) { }

    function setTreasury(address treasury_) external onlyOwner {
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    function setExecutionRouter(address router_) external onlyOwner {
        executionRouter = IExecutionRouter(router_);
        emit ExecutionRouterSet(router_);
    }

    /// @notice Create a TWAP-style buyback schedule: totalAmount is split into chunks over intervalSeconds
    function createSchedule(
        bytes32 scheduleId_,
        address paymentToken_,
        address tokenToBuy_,
        uint256 totalAmount_,
        uint256 chunks_,
        uint256 intervalSeconds_,
        uint256 maxGasLimit_
    ) external onlyOwner {
        if (paymentToken_ == address(0) || tokenToBuy_ == address(0) || chunks_ == 0) revert BuybackModule__ZeroAddress();
        if (schedules[scheduleId_].exists) revert BuybackModule__ZeroAddress();
        schedules[scheduleId_] = BuybackSchedule({
            exists: true,
            cancelled: false,
            treasury: treasury == address(0) ? msg.sender : treasury,
            paymentToken: paymentToken_,
            tokenToBuy: tokenToBuy_,
            totalAmount: totalAmount_,
            chunks: chunks_,
            intervalSeconds: intervalSeconds_,
            maxGasLimit: maxGasLimit_,
            chunksExecuted: 0,
            nextExecutionTime: block.timestamp,
            lastChunkAt: 0
        });
        _scheduleIds.push(scheduleId_);
        emit BuybackScheduleCreated(scheduleId_, paymentToken_, tokenToBuy_, totalAmount_, chunks_, intervalSeconds_, maxGasLimit_);
    }

    function cancelSchedule(bytes32 scheduleId_) external onlyOwner {
        if (!schedules[scheduleId_].exists) revert BuybackModule__ScheduleNotFound();
        schedules[scheduleId_].cancelled = true;
        emit BuybackScheduleCancelled(scheduleId_);
    }

    /// @notice Execute one chunk of a buyback. Checks treasury balance and gas limit. Caller (keeper/owner) triggers.
    function executeBuybackChunk(
        bytes32 scheduleId_,
        IV3SwapRouter.ExactInputSingleParams calldata params_,
        uint256 deadline_,
        uint256 minAmountOutAfterFee_
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        BuybackSchedule storage s = schedules[scheduleId_];
        if (!s.exists || s.cancelled) revert BuybackModule__ScheduleNotFound();
        if (s.chunksExecuted >= s.chunks) revert BuybackModule__ChunksExhausted();
        if (block.timestamp < s.nextExecutionTime) revert BuybackModule__NotYetTime();
        if (gasleft() < s.maxGasLimit) revert BuybackModule__GasLimitExceeded();

        address t = s.treasury;
        uint256 amountThisChunk = s.totalAmount / s.chunks;
        if (IERC20(s.paymentToken).balanceOf(t) < amountThisChunk) revert BuybackModule__InsufficientTreasuryBalance();

        uint256 nonce = executionRouter.executionNonces(t);
        amountOut = executionRouter.executeExactInputSingle(
            params_,
            deadline_,
            t,
            minAmountOutAfterFee_,
            nonce
        );

        s.chunksExecuted++;
        s.lastChunkAt = block.timestamp;
        s.nextExecutionTime = block.timestamp + s.intervalSeconds;
        emit BuybackChunkExecuted(scheduleId_, s.chunksExecuted - 1, amountThisChunk, amountOut);
        return amountOut;
    }

    function getScheduleIds() external view returns (bytes32[] memory) {
        return _scheduleIds;
    }

    function getSchedule(bytes32 scheduleId_) external view returns (BuybackSchedule memory) {
        return schedules[scheduleId_];
    }
}
