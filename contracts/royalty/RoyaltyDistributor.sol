// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Phase3Constants } from "../libraries/Phase3Constants.sol";

/// @title RoyaltyDistributor
/// @notice Splits revenue (creator %, protocol %, optional affiliate %). Tracks claimable. All on-chain.
contract RoyaltyDistributor is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    error RoyaltyDistributor__ZeroAddress();
    error RoyaltyDistributor__BpsExceedsMax();
    error RoyaltyDistributor__SplitExceedsDenominator();
    error RoyaltyDistributor__NothingToClaim();

    event RoyaltyPaid(address indexed token, address indexed creator, address indexed affiliate, uint256 creatorAmount, uint256 protocolAmount, uint256 affiliateAmount);
    event Claimed(address indexed account, address indexed token, uint256 amount);

    address public protocolTreasury;
    uint256 public creatorBps;
    uint256 public protocolBps;
    uint256 public affiliateBps;

    mapping(address account => mapping(address token => uint256)) public claimable;

    constructor(address protocolTreasury_, uint256 creatorBps_, uint256 protocolBps_, uint256 affiliateBps_) Ownable(msg.sender) {
        if (protocolTreasury_ == address(0)) revert RoyaltyDistributor__ZeroAddress();
        if (creatorBps_ > Phase3Constants.MAX_CREATOR_BPS) revert RoyaltyDistributor__BpsExceedsMax();
        if (protocolBps_ > Phase3Constants.MAX_PROTOCOL_BPS) revert RoyaltyDistributor__BpsExceedsMax();
        if (affiliateBps_ > Phase3Constants.MAX_AFFILIATE_BPS) revert RoyaltyDistributor__BpsExceedsMax();
        if (creatorBps_ + protocolBps_ + affiliateBps_ > Phase3Constants.BPS_DENOMINATOR) revert RoyaltyDistributor__SplitExceedsDenominator();

        protocolTreasury = protocolTreasury_;
        creatorBps = creatorBps_;
        protocolBps = protocolBps_;
        affiliateBps = affiliateBps_;
    }

    /// @notice Receive payment and split to creator, protocol, optional affiliate. Caller must have transferred token to this contract first or we pull.
    function receivePayment(address paymentToken, address creator, address affiliate, uint256 amount) external nonReentrant {
        if (paymentToken == address(0) || creator == address(0)) revert RoyaltyDistributor__ZeroAddress();
        if (amount == 0) return;

        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);

        uint256 toCreator = (amount * creatorBps) / Phase3Constants.BPS_DENOMINATOR;
        uint256 toProtocol = (amount * protocolBps) / Phase3Constants.BPS_DENOMINATOR;
        uint256 toAffiliate = affiliate != address(0) ? (amount * affiliateBps) / Phase3Constants.BPS_DENOMINATOR : 0;

        if (toCreator > 0) claimable[creator][paymentToken] += toCreator;
        if (toProtocol > 0) claimable[protocolTreasury][paymentToken] += toProtocol;
        if (toAffiliate > 0) claimable[affiliate][paymentToken] += toAffiliate;

        emit RoyaltyPaid(paymentToken, creator, affiliate, toCreator, toProtocol, toAffiliate);
    }

    /// @notice Claim accumulated balance for a token
    function claim(address token) external nonReentrant {
        uint256 amount = claimable[msg.sender][token];
        if (amount == 0) revert RoyaltyDistributor__NothingToClaim();
        claimable[msg.sender][token] = 0;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, token, amount);
    }

    function setProtocolTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert RoyaltyDistributor__ZeroAddress();
        protocolTreasury = treasury_;
    }

    function setSplit(uint256 creatorBps_, uint256 protocolBps_, uint256 affiliateBps_) external onlyOwner {
        if (creatorBps_ > Phase3Constants.MAX_CREATOR_BPS) revert RoyaltyDistributor__BpsExceedsMax();
        if (protocolBps_ > Phase3Constants.MAX_PROTOCOL_BPS) revert RoyaltyDistributor__BpsExceedsMax();
        if (affiliateBps_ > Phase3Constants.MAX_AFFILIATE_BPS) revert RoyaltyDistributor__BpsExceedsMax();
        if (creatorBps_ + protocolBps_ + affiliateBps_ > Phase3Constants.BPS_DENOMINATOR) revert RoyaltyDistributor__SplitExceedsDenominator();
        creatorBps = creatorBps_;
        protocolBps = protocolBps_;
        affiliateBps = affiliateBps_;
    }
}
