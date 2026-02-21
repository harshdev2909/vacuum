// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IStrategyRegistry
/// @notice Interface for strategy metadata and version registry
interface IStrategyRegistry {
    enum StrategyType { Vault, Execution }

    function register(
        address strategy,
        address creator,
        StrategyType strategyType,
        uint8 riskLevel,
        bytes32 performanceMetricsHash,
        string calldata metadataURI
    ) external returns (uint256 tokenId);

    function upgradeStrategy(address strategy, uint256 newVersion, bytes32 newPerformanceMetricsHash) external;

    function getTokenId(address strategy) external view returns (uint256 tokenId);

    function getActiveVersion(address strategy) external view returns (uint256 version);

    function isActiveVersion(address strategy, uint256 version) external view returns (bool);

    function getCreator(address strategy) external view returns (address creator);
}
