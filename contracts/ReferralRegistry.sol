// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title ReferralRegistry
/// @notice One-time referrer binding, earnings tracking, and reward claims
contract ReferralRegistry is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ReferralRegistry__AlreadyBound();
    error ReferralRegistry__SelfReferral();
    error ReferralRegistry__NotBound();
    error ReferralRegistry__ZeroAddress();
    error ReferralRegistry__ZeroAmount();
    error ReferralRegistry__Unauthorized();
    error ReferralRegistry__NotExecutor();

    event ReferralRegistered(address indexed user, address indexed referrer);
    event ReferralRewardAccrued(address indexed referrer, address indexed token, uint256 amount);
    event ReferralRewardClaimed(address indexed referrer, address indexed token, uint256 amount, address to);

    mapping(address user => address referrer) private _referrerOf;
    mapping(address referrer => mapping(address token => uint256)) private _earnings;
    address private _executor;

    constructor() Ownable(msg.sender) {}

    modifier onlyExecutor() {
        if (msg.sender != _executor) revert ReferralRegistry__NotExecutor();
        _;
    }

    function setExecutor(address executor_) external onlyOwner {
        _executor = executor_;
    }

    /// @notice Register referrer for msg.sender. One-time only.
    function registerReferrer(address referrer) external {
        if (referrer == address(0)) revert ReferralRegistry__ZeroAddress();
        if (referrer == msg.sender) revert ReferralRegistry__SelfReferral();
        if (_referrerOf[msg.sender] != address(0)) revert ReferralRegistry__AlreadyBound();
        _referrerOf[msg.sender] = referrer;
        emit ReferralRegistered(msg.sender, referrer);
    }

    /// @notice Credit referral reward (callable only by execution layer)
    function creditReward(address referrer, address token, uint256 amount) external onlyExecutor {
        if (referrer == address(0) || amount == 0) return;
        _earnings[referrer][token] += amount;
        emit ReferralRewardAccrued(referrer, token, amount);
    }

    /// @notice Claim accrued rewards for a token
    function claimRewards(address token, address to) external nonReentrant {
        if (to == address(0)) to = msg.sender;
        uint256 amount = _earnings[msg.sender][token];
        if (amount == 0) revert ReferralRegistry__ZeroAmount();
        _earnings[msg.sender][token] = 0;
        IERC20(token).safeTransfer(to, amount);
        emit ReferralRewardClaimed(msg.sender, token, amount, to);
    }

    function referrerOf(address user) external view returns (address) {
        return _referrerOf[user];
    }

    function earnings(address referrer, address token) external view returns (uint256) {
        return _earnings[referrer][token];
    }
}
