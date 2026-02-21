// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IBaseStrategy
/// @notice Interface for vault strategies
interface IBaseStrategy {
    function vault() external view returns (address);
    function asset() external view returns (address);
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external returns (uint256 withdrawn);
    function balanceOf() external view returns (uint256);
    function harvest() external returns (uint256 profit);
    function retireStrategy() external;
    function emergencyWithdraw() external;
}
