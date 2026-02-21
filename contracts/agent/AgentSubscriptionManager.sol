// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAgentRegistry } from "./IAgentRegistry.sol";
import { IAgentRevenueDistributor } from "./IAgentRevenueDistributor.sol";
import { IAgentSubscriptionManager } from "./IAgentSubscriptionManager.sol";

/// @title AgentSubscriptionManager
/// @notice User subscription; enforce during execution; track expiry; ERC20 payment
contract AgentSubscriptionManager is ReentrancyGuard, Ownable, IAgentSubscriptionManager {
    using SafeERC20 for IERC20;

    error AgentSubscriptionManager__ZeroAddress();
    error AgentSubscriptionManager__InvalidAgent();
    error AgentSubscriptionManager__InvalidDuration();
    error AgentSubscriptionManager__InsufficientPayment();

    IAgentRegistry public agentRegistry;
    IAgentRevenueDistributor public revenueDistributor;

    mapping(address => mapping(bytes32 => uint256)) private _subscriptionExpiry;

    constructor(address registry_, address revenueDistributor_) Ownable(msg.sender) {
        if (registry_ == address(0) || revenueDistributor_ == address(0)) revert AgentSubscriptionManager__ZeroAddress();
        agentRegistry = IAgentRegistry(registry_);
        revenueDistributor = IAgentRevenueDistributor(revenueDistributor_);
    }

    function subscribe(bytes32 agentId_, uint256 durationSeconds_, address paymentToken_, uint256 amount_) external override nonReentrant {
        if (paymentToken_ == address(0)) revert AgentSubscriptionManager__ZeroAddress();
        if (durationSeconds_ == 0) revert AgentSubscriptionManager__InvalidDuration();
        if (amount_ == 0) revert AgentSubscriptionManager__InsufficientPayment();
        if (!agentRegistry.isActive(agentId_)) revert AgentSubscriptionManager__InvalidAgent();

        IERC20(paymentToken_).safeTransferFrom(msg.sender, address(this), amount_);
        IERC20(paymentToken_).forceApprove(address(revenueDistributor), amount_);
        revenueDistributor.receiveRevenue(agentId_, paymentToken_, amount_);

        uint256 currentExpiry = _subscriptionExpiry[msg.sender][agentId_];
        uint256 start = currentExpiry > block.timestamp ? currentExpiry : block.timestamp;
        uint256 newExpiry = start + durationSeconds_;
        _subscriptionExpiry[msg.sender][agentId_] = newExpiry;
        emit SubscriptionCreated(msg.sender, agentId_, newExpiry, paymentToken_, amount_);
    }

    function cancel(bytes32 agentId_) external override {
        if (_subscriptionExpiry[msg.sender][agentId_] <= block.timestamp) return;
        _subscriptionExpiry[msg.sender][agentId_] = block.timestamp;
        emit SubscriptionCancelled(msg.sender, agentId_);
    }

    function isSubscriptionActive(address user_, bytes32 agentId_) external view override returns (bool) {
        return _subscriptionExpiry[user_][agentId_] > block.timestamp;
    }

    function subscriptionExpiry(address user_, bytes32 agentId_) external view override returns (uint256) {
        return _subscriptionExpiry[user_][agentId_];
    }
}
