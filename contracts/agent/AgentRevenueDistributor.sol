// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAgentRegistry } from "./IAgentRegistry.sol";
import { IAgentRevenueDistributor } from "./IAgentRevenueDistributor.sol";
import { Phase5Constants } from "../libraries/Phase5Constants.sol";

/// @title AgentRevenueDistributor
/// @notice Split revenue automatically; track claimable; allow claim; emit RevenueClaimed
contract AgentRevenueDistributor is ReentrancyGuard, Ownable, IAgentRevenueDistributor {
    using SafeERC20 for IERC20;

    error AgentRevenueDistributor__ZeroAddress();
    error AgentRevenueDistributor__BpsExceedsMax();
    error AgentRevenueDistributor__SplitExceedsDenominator();
    error AgentRevenueDistributor__NothingToClaim();

    IAgentRegistry public agentRegistry;
    address public protocolTreasury;
    uint256 public agentBps = 8000;  // 80% to agent creator
    uint256 public protocolBps = 2000; // 20% to protocol

    mapping(address => mapping(address => uint256)) private _claimable;

    constructor(address owner_, address registry_, address protocolTreasury_) Ownable(owner_) {
        if (registry_ == address(0) || protocolTreasury_ == address(0)) revert AgentRevenueDistributor__ZeroAddress();
        agentRegistry = IAgentRegistry(registry_);
        protocolTreasury = protocolTreasury_;
    }

    function setBps(uint256 agentBps_, uint256 protocolBps_) external onlyOwner {
        if (agentBps_ > Phase5Constants.MAX_AGENT_BPS) revert AgentRevenueDistributor__BpsExceedsMax();
        if (protocolBps_ > Phase5Constants.MAX_PROTOCOL_BPS) revert AgentRevenueDistributor__BpsExceedsMax();
        if (agentBps_ + protocolBps_ > Phase5Constants.BPS_DENOMINATOR) revert AgentRevenueDistributor__SplitExceedsDenominator();
        agentBps = agentBps_;
        protocolBps = protocolBps_;
    }

    /// @notice Receive revenue for an agent; split to agent creator and protocol
    function receiveRevenue(bytes32 agentId_, address token_, uint256 amount_) external override nonReentrant {
        if (token_ == address(0) || amount_ == 0) return;
        address creator = agentRegistry.creatorOf(agentId_);
        if (creator == address(0)) return;

        IERC20(token_).safeTransferFrom(msg.sender, address(this), amount_);
        uint256 toAgent = (amount_ * agentBps) / Phase5Constants.BPS_DENOMINATOR;
        uint256 toProtocol = (amount_ * protocolBps) / Phase5Constants.BPS_DENOMINATOR;
        if (toAgent > 0) _claimable[creator][token_] += toAgent;
        if (toProtocol > 0) _claimable[protocolTreasury][token_] += toProtocol;
        emit RevenueReceived(agentId_, token_, amount_, toAgent, toProtocol);
    }

    function claimable(address account_, address token_) external view override returns (uint256) {
        return _claimable[account_][token_];
    }

    function claim(address token_) external override nonReentrant {
        uint256 amount = _claimable[msg.sender][token_];
        if (amount == 0) revert AgentRevenueDistributor__NothingToClaim();
        _claimable[msg.sender][token_] = 0;
        IERC20(token_).safeTransfer(msg.sender, amount);
        emit RevenueClaimed(msg.sender, token_, amount);
    }
}
