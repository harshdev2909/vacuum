// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IStrategySubscriptionManager
/// @notice Interface for strategy subscription (pay to use strategy execution)
interface IStrategySubscriptionManager {
    function subscribe(uint256 strategyTokenId, uint256 durationSeconds, address paymentToken, uint256 amount) external;

    function cancel(uint256 strategyTokenId) external;

    function isSubscriptionActive(address user, uint256 strategyTokenId) external view returns (bool);

    function subscriptionExpiry(address user, uint256 strategyTokenId) external view returns (uint256 expiryTimestamp);
}
