// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IStrategyNFT } from "../interfaces/IStrategyNFT.sol";
import { RoyaltyDistributor } from "../royalty/RoyaltyDistributor.sol";

/// @title StrategySubscriptionManager
/// @notice Subscription payment in ERC20. Enforce active subscription for execution. Recurring via extend. Cancel allowed.
contract StrategySubscriptionManager is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    error StrategySubscriptionManager__ZeroAddress();
    error StrategySubscriptionManager__InvalidToken();
    error StrategySubscriptionManager__InvalidDuration();
    error StrategySubscriptionManager__InsufficientPayment();

    event SubscriptionCreated(address indexed user, uint256 indexed strategyTokenId, uint256 expiryTimestamp, address paymentToken, uint256 amount);
    event SubscriptionCancelled(address indexed user, uint256 indexed strategyTokenId);

    IStrategyNFT public immutable strategyNFT;
    RoyaltyDistributor public immutable royaltyDistributor;

    mapping(address user => mapping(uint256 strategyTokenId => uint256)) public subscriptionExpiry;

    constructor(address strategyNFT_, address royaltyDistributor_) Ownable(msg.sender) {
        if (strategyNFT_ == address(0) || royaltyDistributor_ == address(0)) revert StrategySubscriptionManager__ZeroAddress();
        strategyNFT = IStrategyNFT(strategyNFT_);
        royaltyDistributor = RoyaltyDistributor(payable(royaltyDistributor_));
    }

    /// @notice Subscribe: pay in ERC20, extend or start subscription. Revenue split via RoyaltyDistributor.
    function subscribe(uint256 strategyTokenId, uint256 durationSeconds, address paymentToken, uint256 amount) external nonReentrant {
        if (paymentToken == address(0)) revert StrategySubscriptionManager__ZeroAddress();
        if (durationSeconds == 0) revert StrategySubscriptionManager__InvalidDuration();
        if (amount == 0) revert StrategySubscriptionManager__InsufficientPayment();

        address creator = strategyNFT.creatorByToken(strategyTokenId);
        if (creator == address(0)) revert StrategySubscriptionManager__InvalidToken();

        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(paymentToken).forceApprove(address(royaltyDistributor), amount);
        royaltyDistributor.receivePayment(paymentToken, creator, address(0), amount);

        uint256 currentExpiry = subscriptionExpiry[msg.sender][strategyTokenId];
        uint256 start = currentExpiry > block.timestamp ? currentExpiry : block.timestamp;
        uint256 newExpiry = start + durationSeconds;
        subscriptionExpiry[msg.sender][strategyTokenId] = newExpiry;

        emit SubscriptionCreated(msg.sender, strategyTokenId, newExpiry, paymentToken, amount);
    }

    /// @notice Cancel subscription: set expiry to now so it is no longer active
    function cancel(uint256 strategyTokenId) external {
        if (subscriptionExpiry[msg.sender][strategyTokenId] <= block.timestamp) return;
        subscriptionExpiry[msg.sender][strategyTokenId] = block.timestamp;
        emit SubscriptionCancelled(msg.sender, strategyTokenId);
    }

    function isSubscriptionActive(address user, uint256 strategyTokenId) external view returns (bool) {
        return subscriptionExpiry[user][strategyTokenId] > block.timestamp;
    }
}
