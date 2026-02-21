// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Phase4Constants } from "../libraries/Phase4Constants.sol";

/// @title RiskGuard
/// @notice Enforces max daily spend, max slippage, strategy whitelist, and pause for DAO automation
contract RiskGuard is Pausable, Ownable {
    error RiskGuard__ZeroAddress();
    error RiskGuard__ExceedsDailySpend();
    error RiskGuard__SlippageTooHigh();
    error RiskGuard__StrategyNotWhitelisted();
    error RiskGuard__Paused();

    event MaxDailySpendSet(uint256 amount);
    event MaxSlippageBpsSet(uint256 bps);
    event StrategyWhitelisted(address indexed strategy, bool allowed);
    event DailySpendReset(uint256 indexed day, uint256 spent);

    uint256 public maxDailySpend;
    uint256 public maxSlippageBps;
    mapping(address => bool) public whitelistedStrategies;
    mapping(uint256 day => uint256 spent) public dailySpend;
    address public automationController;

    constructor(address owner_) Ownable(owner_) {
        maxSlippageBps = 100; // 1% default
    }

    function setAutomationController(address controller_) external onlyOwner {
        automationController = controller_;
    }

    function setMaxDailySpend(uint256 amount_) external onlyOwner {
        maxDailySpend = amount_;
        emit MaxDailySpendSet(amount_);
    }

    function setMaxSlippageBps(uint256 bps_) external onlyOwner {
        if (bps_ > Phase4Constants.MAX_SLIPPAGE_BPS) revert RiskGuard__SlippageTooHigh();
        maxSlippageBps = bps_;
        emit MaxSlippageBpsSet(bps_);
    }

    function setStrategyWhitelisted(address strategy_, bool allowed_) external onlyOwner {
        if (strategy_ == address(0)) revert RiskGuard__ZeroAddress();
        whitelistedStrategies[strategy_] = allowed_;
        emit StrategyWhitelisted(strategy_, allowed_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Validate execution: daily spend, slippage, whitelist, pause. Reverts if invalid. No state change.
    function validateExecution(
        address strategyOrTarget_,
        uint256 spendAmount_,
        uint256 minAmountOut_,
        uint256 expectedAmountOut_
    ) external view {
        if (paused()) revert RiskGuard__Paused();
        if (!whitelistedStrategies[strategyOrTarget_]) revert RiskGuard__StrategyNotWhitelisted();
        uint256 day = block.timestamp / Phase4Constants.SECONDS_PER_DAY;
        if (dailySpend[day] + spendAmount_ > maxDailySpend) revert RiskGuard__ExceedsDailySpend();
        if (expectedAmountOut_ > 0 && minAmountOut_ < (expectedAmountOut_ * (Phase4Constants.BPS_DENOMINATOR - maxSlippageBps)) / Phase4Constants.BPS_DENOMINATOR) {
            revert RiskGuard__SlippageTooHigh();
        }
    }

    /// @notice Record spend after successful execution. Only callable by automation controller.
    function recordSpend(uint256 spendAmount_) external {
        if (msg.sender != automationController) revert RiskGuard__ZeroAddress();
        uint256 day = block.timestamp / Phase4Constants.SECONDS_PER_DAY;
        dailySpend[day] += spendAmount_;
        emit DailySpendReset(day, dailySpend[day]);
    }

    /// @notice Pre-check only (no state change). For controller to use before executing.
    function canExecute(address strategyOrTarget_, uint256 spendAmount_) external view returns (bool) {
        if (paused()) return false;
        if (!whitelistedStrategies[strategyOrTarget_]) return false;
        uint256 day = block.timestamp / Phase4Constants.SECONDS_PER_DAY;
        return dailySpend[day] + spendAmount_ <= maxDailySpend;
    }

    /// @notice Get current day's spend (for off-chain display)
    function getCurrentDaySpend() external view returns (uint256) {
        uint256 day = block.timestamp / Phase4Constants.SECONDS_PER_DAY;
        return dailySpend[day];
    }
}
