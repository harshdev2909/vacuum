// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentSubscriptionManager
/// @notice SDK-compatible: user subscription, enforce during execution, track expiry, ERC20 payment
interface IAgentSubscriptionManager {
    event SubscriptionCreated(address indexed user, bytes32 indexed agentId, uint256 expiryTimestamp, address paymentToken, uint256 amount);
    event SubscriptionCancelled(address indexed user, bytes32 indexed agentId);

    function subscribe(bytes32 agentId_, uint256 durationSeconds_, address paymentToken_, uint256 amount_) external;
    function cancel(bytes32 agentId_) external;
    function isSubscriptionActive(address user_, bytes32 agentId_) external view returns (bool);
    function subscriptionExpiry(address user_, bytes32 agentId_) external view returns (uint256);
}
