// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IBaseStrategy } from "./IBaseStrategy.sol";

/// @title BaseStrategy
/// @notice Abstract base for vault strategies. Only the linked vault can call deposit/withdraw.
abstract contract BaseStrategy is ReentrancyGuard, IBaseStrategy {
    using SafeERC20 for IERC20;

    address public immutable vault;
    address public immutable asset;

    error BaseStrategy__OnlyVault();
    error BaseStrategy__ZeroAmount();
    error BaseStrategy__TransferFailed();

    modifier onlyVault() {
        if (msg.sender != vault) revert BaseStrategy__OnlyVault();
        _;
    }

    constructor(address vault_, address asset_) {
        if (vault_ == address(0) || asset_ == address(0)) revert BaseStrategy__ZeroAmount();
        vault = vault_;
        asset = asset_;
    }

    /// @inheritdoc IBaseStrategy
    function deposit(uint256 amount) external virtual onlyVault nonReentrant {
        if (amount == 0) return;
        IERC20(asset).safeTransferFrom(vault, address(this), amount);
        _deposit(amount);
    }

    /// @inheritdoc IBaseStrategy
    function withdraw(uint256 amount) external virtual onlyVault nonReentrant returns (uint256 withdrawn) {
        if (amount == 0) return 0;
        withdrawn = _withdraw(amount);
        if (withdrawn > 0) {
            IERC20(asset).safeTransfer(vault, withdrawn);
        }
    }

    /// @inheritdoc IBaseStrategy
    function harvest() external virtual nonReentrant returns (uint256 profit) {
        return _harvest();
    }

    /// @inheritdoc IBaseStrategy
    function retireStrategy() external virtual onlyVault {
        _retireStrategy();
    }

    /// @inheritdoc IBaseStrategy
    function emergencyWithdraw() external virtual onlyVault nonReentrant {
        _emergencyWithdraw();
    }

    function _deposit(uint256 amount) internal virtual;
    function _withdraw(uint256 amount) internal virtual returns (uint256 withdrawn);
    function _harvest() internal virtual returns (uint256 profit);
    function _retireStrategy() internal virtual;
    function _emergencyWithdraw() internal virtual;
}
