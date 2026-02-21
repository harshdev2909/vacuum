// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { BaseStrategy } from "./BaseStrategy.sol";

/// @notice Mock strategy for unit tests: holds asset, reports balanceOf, optional simulated profit.
contract MockStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    /// @param vault_ Vault address
    /// @param asset_ Asset token address
    constructor(address vault_, address asset_) BaseStrategy(vault_, asset_) {}

    function balanceOf() external view override returns (uint256) {
        return IERC20(asset).balanceOf(address(this));
    }

    function _deposit(uint256) internal pure override {
        // Tokens already sent by vault; we just hold.
    }

    function _withdraw(uint256 amount) internal view override returns (uint256 withdrawn) {
        uint256 bal = IERC20(asset).balanceOf(address(this));
        withdrawn = bal < amount ? bal : amount;
    }

    function _harvest() internal virtual override returns (uint256) {
        return 0;
    }

    function _retireStrategy() internal override {
        uint256 bal = IERC20(asset).balanceOf(address(this));
        if (bal > 0) IERC20(asset).safeTransfer(vault, bal);
    }

    function _emergencyWithdraw() internal override {
        uint256 bal = IERC20(asset).balanceOf(address(this));
        if (bal > 0) IERC20(asset).safeTransfer(vault, bal);
    }
}
