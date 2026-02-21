// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { MockStrategy } from "../strategy/MockStrategy.sol";

interface IMintable {
    function mint(address to, uint256 amount) external;
}

/// @notice Mock strategy for unit tests: simulates profit by minting to itself in _harvest().
contract MockStrategyWithHarvest is MockStrategy {
    uint256 public simulatedProfit;

    constructor(address vault_, address asset_) MockStrategy(vault_, asset_) {}

    function setSimulatedProfit(uint256 amount) external {
        simulatedProfit = amount;
    }

    function _harvest() internal override returns (uint256) {
        if (simulatedProfit > 0) {
            IMintable(asset).mint(address(this), simulatedProfit);
            uint256 p = simulatedProfit;
            simulatedProfit = 0;
            return p;
        }
        return 0;
    }
}
