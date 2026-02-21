// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAgentRegistry } from "./IAgentRegistry.sol";
import { IAgentStaking } from "./IAgentStaking.sol";

/// @title AgentStaking
/// @notice Require stake to activate; lock stake; support unstake; optional slash
contract AgentStaking is ReentrancyGuard, Ownable, IAgentStaking {
    using SafeERC20 for IERC20;

    error AgentStaking__ZeroAddress();
    error AgentStaking__InsufficientStake();
    error AgentStaking__LockPeriod();
    error AgentStaking__AgentNotActive();
    error AgentStaking__OnlyRegistry();

    event MinimumStakeSet(bytes32 indexed agentId, uint256 amount);
    event LockPeriodSet(uint256 seconds_);
    event StakingTokenSet(address indexed token);

    IAgentRegistry public agentRegistry;
    IERC20 public stakingToken;
    uint256 public lockPeriodSeconds = 7 days;

    mapping(bytes32 => uint256) public minimumStakeForAgent;
    mapping(bytes32 => mapping(address => uint256)) public stakeBalance;
    mapping(bytes32 => mapping(address => uint256)) public stakeDepositedAt;
    mapping(bytes32 => uint256) public totalStakeByAgent;

    constructor(address owner_, address registry_, address stakingToken_) Ownable(owner_) {
        if (registry_ == address(0) || stakingToken_ == address(0)) revert AgentStaking__ZeroAddress();
        agentRegistry = IAgentRegistry(registry_);
        stakingToken = IERC20(stakingToken_);
    }

    function setMinimumStake(bytes32 agentId_, uint256 amount_) external onlyOwner {
        minimumStakeForAgent[agentId_] = amount_;
        emit MinimumStakeSet(agentId_, amount_);
    }

    function setLockPeriod(uint256 seconds_) external onlyOwner {
        lockPeriodSeconds = seconds_;
        emit LockPeriodSet(seconds_);
    }

    function stake(bytes32 agentId_, uint256 amount_) external override nonReentrant {
        if (amount_ == 0) return;
        if (!agentRegistry.isActive(agentId_)) revert AgentStaking__AgentNotActive();
        stakingToken.safeTransferFrom(msg.sender, address(this), amount_);
        stakeBalance[agentId_][msg.sender] += amount_;
        stakeDepositedAt[agentId_][msg.sender] = block.timestamp;
        totalStakeByAgent[agentId_] += amount_;
        emit StakeDeposited(agentId_, msg.sender, amount_);
    }

    function unstake(bytes32 agentId_, uint256 amount_) external override nonReentrant {
        if (amount_ == 0) return;
        if (stakeBalance[agentId_][msg.sender] < amount_) revert AgentStaking__InsufficientStake();
        if (block.timestamp < stakeDepositedAt[agentId_][msg.sender] + lockPeriodSeconds) revert AgentStaking__LockPeriod();
        stakeBalance[agentId_][msg.sender] -= amount_;
        totalStakeByAgent[agentId_] -= amount_;
        stakingToken.safeTransfer(msg.sender, amount_);
        emit StakeWithdrawn(agentId_, msg.sender, amount_);
    }

    /// @notice Slash agent stake (optional). Owner or authorized slasher. Slashed tokens stay in contract (or send to treasury).
    function slash(bytes32 agentId_, uint256 amount_) external override onlyOwner nonReentrant {
        if (amount_ == 0) return;
        uint256 total = totalStakeByAgent[agentId_];
        if (total < amount_) amount_ = total;
        totalStakeByAgent[agentId_] -= amount_;
        emit AgentSlashed(agentId_, msg.sender, amount_);
    }

    function stakeOf(bytes32 agentId_, address staker_) external view override returns (uint256) {
        return stakeBalance[agentId_][staker_];
    }

    function totalStake(bytes32 agentId_) external view override returns (uint256) {
        return totalStakeByAgent[agentId_];
    }

    function meetsMinimumStake(bytes32 agentId_) external view override returns (bool) {
        uint256 min = minimumStakeForAgent[agentId_];
        if (min == 0) return true;
        return totalStakeByAgent[agentId_] >= min;
    }
}
