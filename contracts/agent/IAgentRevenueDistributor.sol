// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentRevenueDistributor
/// @notice SDK-compatible interface: split revenue, track claimable, claim, RevenueClaimed event
interface IAgentRevenueDistributor {
    event RevenueReceived(bytes32 indexed agentId, address indexed token, uint256 amount, uint256 agentShare, uint256 protocolShare);
    event RevenueClaimed(address indexed account, address indexed token, uint256 amount);

    function receiveRevenue(bytes32 agentId_, address token_, uint256 amount_) external;
    function claimable(address account_, address token_) external view returns (uint256);
    function claim(address token_) external;
}
