// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IBaseStrategy } from "../strategy/IBaseStrategy.sol";
import { VaultConstants } from "./VaultConstants.sol";

/// @title Vault
/// @notice ERC-4626 compliant vault with deposit cap, performance fee (on profit only), optional withdrawal fee, and strategy.
contract Vault is ERC4626, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    IBaseStrategy public strategy;
    address public treasury;
    uint256 public depositCap;
    uint256 public performanceFeeBps;
    uint256 public withdrawalFeeBps;
    uint256 public lastTotalAssetsForFee;
    bool public strategyActive;

    event StrategySet(address indexed strategy);
    event TreasurySet(address indexed treasury);
    event DepositCapSet(uint256 cap);
    event PerformanceFeeSet(uint256 bps);
    event WithdrawalFeeSet(uint256 bps);
    event Harvest(uint256 profit, uint256 feeTaken, uint256 reinvested);
    event StrategyRetired(address indexed strategy);
    event EmergencyWithdraw(address indexed strategy, uint256 amount);

    error Vault__ZeroAddress();
    error Vault__FeeTooHigh();
    error Vault__DepositCapExceeded();
    error Vault__StrategyAlreadySet();
    error Vault__NoStrategy();
    error Vault__StrategyActive();

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address treasury_,
        uint256 depositCap_,
        uint256 performanceFeeBps_,
        uint256 withdrawalFeeBps_
    ) ERC4626(asset_) ERC20(name_, symbol_) Ownable(msg.sender) {
        if (treasury_ == address(0)) revert Vault__ZeroAddress();
        if (performanceFeeBps_ > VaultConstants.MAX_PERFORMANCE_FEE_BPS) revert Vault__FeeTooHigh();
        if (withdrawalFeeBps_ > VaultConstants.MAX_WITHDRAWAL_FEE_BPS) revert Vault__FeeTooHigh();
        treasury = treasury_;
        depositCap = depositCap_;
        performanceFeeBps = performanceFeeBps_;
        withdrawalFeeBps = withdrawalFeeBps_;
        lastTotalAssetsForFee = 0;
        strategyActive = false;
    }

    function setStrategy(IBaseStrategy strategy_) external onlyOwner {
        if (strategyActive) revert Vault__StrategyActive();
        if (address(strategy_) != address(0) && address(strategy_.vault()) != address(this)) revert Vault__ZeroAddress();
        strategy = strategy_;
        strategyActive = address(strategy_) != address(0);
        if (strategyActive) lastTotalAssetsForFee = totalAssets();
        emit StrategySet(address(strategy_));
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert Vault__ZeroAddress();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    function setDepositCap(uint256 cap_) external onlyOwner {
        depositCap = cap_;
        emit DepositCapSet(cap_);
    }

    function setPerformanceFeeBps(uint256 bps_) external onlyOwner {
        if (bps_ > VaultConstants.MAX_PERFORMANCE_FEE_BPS) revert Vault__FeeTooHigh();
        performanceFeeBps = bps_;
        emit PerformanceFeeSet(bps_);
    }

    function setWithdrawalFeeBps(uint256 bps_) external onlyOwner {
        if (bps_ > VaultConstants.MAX_WITHDRAWAL_FEE_BPS) revert Vault__FeeTooHigh();
        withdrawalFeeBps = bps_;
        emit WithdrawalFeeSet(bps_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @inheritdoc ERC4626
    function totalAssets() public view virtual override returns (uint256) {
        uint256 inVault = IERC20(asset()).balanceOf(address(this));
        if (!strategyActive || address(strategy) == address(0)) return inVault;
        return inVault + strategy.balanceOf();
    }

    function maxDeposit(address) public view virtual override returns (uint256) {
        if (paused()) return 0;
        uint256 cap = depositCap;
        if (cap == 0) return type(uint256).max;
        uint256 current = totalAssets();
        if (current >= cap) return 0;
        return cap - current;
    }

    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal virtual override nonReentrant whenNotPaused {
        if (totalAssets() + assets > depositCap && depositCap != 0) revert Vault__DepositCapExceeded();
        super._deposit(caller, receiver, assets, shares);
        if (strategyActive && address(strategy) != address(0) && assets > 0) {
            IERC20(asset()).forceApprove(address(strategy), assets);
            strategy.deposit(assets);
        }
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual override nonReentrant whenNotPaused {
        uint256 balanceHere = IERC20(asset()).balanceOf(address(this));
        if (balanceHere < assets && strategyActive && address(strategy) != address(0)) {
            strategy.withdraw(assets - balanceHere);
        }
        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }
        _burn(owner, shares);
        uint256 fee = 0;
        if (withdrawalFeeBps > 0) {
            fee = (assets * withdrawalFeeBps) / VaultConstants.BPS_DENOMINATOR;
            assets -= fee;
            if (fee > 0) IERC20(asset()).safeTransfer(treasury, fee);
        }
        IERC20(asset()).safeTransfer(receiver, assets);
        emit Withdraw(caller, receiver, owner, assets + fee, shares);
    }

    /// @notice Harvest from strategy: claim rewards, take performance fee on profit only, reinvest.
    function harvest() external nonReentrant whenNotPaused {
        if (!strategyActive || address(strategy) == address(0)) return;
        uint256 beforeTotal = totalAssets();
        strategy.harvest();
        uint256 afterTotal = totalAssets();
        if (afterTotal <= beforeTotal) {
            lastTotalAssetsForFee = afterTotal;
            return;
        }
        uint256 actualProfit = afterTotal - beforeTotal;
        uint256 feeAmount = (actualProfit * performanceFeeBps) / VaultConstants.BPS_DENOMINATOR;
        if (feeAmount > 0 && address(strategy) != address(0)) {
            strategy.withdraw(feeAmount);
            IERC20(asset()).safeTransfer(treasury, feeAmount);
        }
        lastTotalAssetsForFee = totalAssets();
        emit Harvest(actualProfit, feeAmount, actualProfit - feeAmount);
    }

    /// @notice Retire current strategy (withdraw all) and optionally set new strategy.
    function retireStrategyAndSetNew(IBaseStrategy newStrategy_) external onlyOwner {
        if (!strategyActive || address(strategy) == address(0)) return;
        strategy.retireStrategy();
        strategyActive = false;
        emit StrategyRetired(address(strategy));
        strategy = newStrategy_;
        if (address(newStrategy_) != address(0) && address(newStrategy_.vault()) == address(this)) {
            strategyActive = true;
            uint256 balance = IERC20(asset()).balanceOf(address(this));
            if (balance > 0) {
                IERC20(asset()).forceApprove(address(newStrategy_), balance);
                newStrategy_.deposit(balance);
            }
            lastTotalAssetsForFee = totalAssets();
            emit StrategySet(address(newStrategy_));
        }
    }

    /// @notice Emergency withdraw all from strategy to vault (no new strategy).
    function emergencyWithdrawFromStrategy() external onlyOwner {
        if (address(strategy) == address(0)) revert Vault__NoStrategy();
        strategy.emergencyWithdraw();
        emit EmergencyWithdraw(address(strategy), IERC20(asset()).balanceOf(address(this)));
    }
}
