// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentStaking
/// @notice SDK-compatible interface for agent stake (required to activate), lock, unstake, optional slash
interface IAgentStaking {
    event StakeDeposited(bytes32 indexed agentId, address indexed staker, uint256 amount);
    event StakeWithdrawn(bytes32 indexed agentId, address indexed staker, uint256 amount);
    event AgentSlashed(bytes32 indexed agentId, address indexed slasher, uint256 amount);

    function stake(bytes32 agentId_, uint256 amount_) external;
    function unstake(bytes32 agentId_, uint256 amount_) external;
    function slash(bytes32 agentId_, uint256 amount_) external;
    function stakeOf(bytes32 agentId_, address staker_) external view returns (uint256);
    function totalStake(bytes32 agentId_) external view returns (uint256);
    function meetsMinimumStake(bytes32 agentId_) external view returns (bool);
}
