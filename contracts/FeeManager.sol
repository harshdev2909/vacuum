// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Constants } from "./libraries/Constants.sol";

/// @title FeeManager
/// @notice Manages protocol fees, referral split, treasury, and multi-token fee accounting
contract FeeManager is Ownable {
    using SafeERC20 for IERC20;

    error FeeManager__FeeExceedsMax();
    error FeeManager__ReferralSplitExceedsMax();
    error FeeManager__ZeroAddress();
    error FeeManager__ZeroAmount();
    error FeeManager__TransferFailed();
    error FeeManager__NotExecutor();

    event FeeConfigUpdated(uint256 protocolFeeBps, uint256 referralSplitBps);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event FeeCollected(address indexed token, address indexed from, uint256 amount, uint256 referralAmount);
    event TreasuryWithdrawal(address indexed token, address indexed to, uint256 amount);

    uint256 private _protocolFeeBps;
    uint256 private _referralSplitBps; // share of protocol fee that goes to referrer (bps of fee)
    address private _treasury;
    address private _executor; // ExecutionRouter
    mapping(address token => uint256) private _totalFeesCollected;

    modifier onlyExecutor() {
        if (msg.sender != _executor) revert FeeManager__NotExecutor();
        _;
    }

    constructor(address treasury_, uint256 protocolFeeBps_, uint256 referralSplitBps_) Ownable(msg.sender) {
        if (treasury_ == address(0)) revert FeeManager__ZeroAddress();
        _treasury = treasury_;
        _setFeeConfig(protocolFeeBps_, referralSplitBps_);
    }

    function setExecutor(address executor_) external onlyOwner {
        _executor = executor_;
    }

    function setFeeConfig(uint256 protocolFeeBps_, uint256 referralSplitBps_) external onlyOwner {
        _setFeeConfig(protocolFeeBps_, referralSplitBps_);
    }

    function _setFeeConfig(uint256 protocolFeeBps_, uint256 referralSplitBps_) private {
        if (protocolFeeBps_ > Constants.MAX_FEE_BPS) revert FeeManager__FeeExceedsMax();
        if (referralSplitBps_ > Constants.BPS_DENOMINATOR) revert FeeManager__ReferralSplitExceedsMax();
        _protocolFeeBps = protocolFeeBps_;
        _referralSplitBps = referralSplitBps_;
        emit FeeConfigUpdated(protocolFeeBps_, referralSplitBps_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert FeeManager__ZeroAddress();
        address previous = _treasury;
        _treasury = treasury_;
        emit TreasuryUpdated(previous, treasury_);
    }

    /// @notice Record fee collected and optionally referral portion (for events/accounting)
    function recordFeeCollected(address token, address from, uint256 totalFeeAmount, uint256 referralAmount) external onlyExecutor {
        if (token == address(0) || totalFeeAmount == 0) return;
        _totalFeesCollected[token] += totalFeeAmount;
        emit FeeCollected(token, from, totalFeeAmount, referralAmount);
    }

    /// @notice Withdraw accumulated fees (or any ERC20) to treasury
    function withdrawToTreasury(address token, uint256 amount) external onlyOwner {
        if (amount == 0) revert FeeManager__ZeroAmount();
        address to = _treasury;
        if (token == address(0)) {
            (bool ok,) = payable(to).call{ value: amount }("");
            if (!ok) revert FeeManager__TransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        emit TreasuryWithdrawal(token, to, amount);
    }

    function protocolFeeBps() external view returns (uint256) {
        return _protocolFeeBps;
    }

    function referralSplitBps() external view returns (uint256) {
        return _referralSplitBps;
    }

    function treasury() external view returns (address) {
        return _treasury;
    }

    function totalFeesCollected(address token) external view returns (uint256) {
        return _totalFeesCollected[token];
    }

    /// @notice Compute protocol fee amount from a value (e.g. swap amountOut or fee basis)
    function computeProtocolFee(uint256 value) external view returns (uint256) {
        return (value * _protocolFeeBps) / Constants.BPS_DENOMINATOR;
    }

    /// @notice Compute referral portion of a given fee amount
    function computeReferralShare(uint256 feeAmount) external view returns (uint256) {
        return (feeAmount * _referralSplitBps) / Constants.BPS_DENOMINATOR;
    }

    receive() external payable { }
}
