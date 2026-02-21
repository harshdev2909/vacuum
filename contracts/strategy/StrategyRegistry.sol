// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IStrategyNFT } from "../interfaces/IStrategyNFT.sol";
import { IStrategyRegistry } from "../interfaces/IStrategyRegistry.sol";

/// @title StrategyRegistry
/// @notice Registers strategy metadata, version history. Only creator can upgrade. Mints Strategy NFT on register.
contract StrategyRegistry is Ownable, IStrategyRegistry {
    error StrategyRegistry__ZeroAddress();
    error StrategyRegistry__NotCreator();
    error StrategyRegistry__AlreadyRegistered();
    error StrategyRegistry__NFTAlreadySet();

    event StrategyUpdated(address indexed strategy, uint256 indexed version, bytes32 performanceMetricsHash);

    IStrategyNFT public strategyNFT;

    struct StrategyMeta {
        address creator;
        StrategyType strategyType;
        uint8 riskLevel;
        uint256 activeVersion;
        bytes32 performanceMetricsHash;
    }
    mapping(address strategy => StrategyMeta) private _meta;
    mapping(address strategy => uint256) private _tokenIdByStrategy;
    mapping(address strategy => mapping(uint256 version => bytes32)) private _versionHistory;

    constructor() Ownable(msg.sender) { }

    function setStrategyNFT(address strategyNFT_) external onlyOwner {
        if (address(strategyNFT) != address(0)) revert StrategyRegistry__NFTAlreadySet();
        if (strategyNFT_ == address(0)) revert StrategyRegistry__ZeroAddress();
        strategyNFT = IStrategyNFT(strategyNFT_);
    }

    function register(
        address strategy,
        address creator,
        StrategyType strategyType,
        uint8 riskLevel,
        bytes32 performanceMetricsHash,
        string calldata metadataURI
    ) external onlyOwner returns (uint256 tokenId) {
        if (strategy == address(0) || creator == address(0)) revert StrategyRegistry__ZeroAddress();
        if (_tokenIdByStrategy[strategy] != 0) revert StrategyRegistry__AlreadyRegistered();

        _meta[strategy] = StrategyMeta({
            creator: creator,
            strategyType: strategyType,
            riskLevel: riskLevel,
            activeVersion: 1,
            performanceMetricsHash: performanceMetricsHash
        });
        _versionHistory[strategy][1] = performanceMetricsHash;

        tokenId = strategyNFT.mint(creator, strategy, creator, 1, metadataURI);
        _tokenIdByStrategy[strategy] = tokenId;

        emit StrategyUpdated(strategy, 1, performanceMetricsHash);
    }

    function upgradeStrategy(address strategy, uint256 newVersion, bytes32 newPerformanceMetricsHash) external {
        StrategyMeta storage m = _meta[strategy];
        if (m.creator == address(0)) revert StrategyRegistry__ZeroAddress();
        if (msg.sender != m.creator) revert StrategyRegistry__NotCreator();
        if (newVersion <= m.activeVersion) revert StrategyRegistry__NotCreator();

        m.activeVersion = newVersion;
        m.performanceMetricsHash = newPerformanceMetricsHash;
        _versionHistory[strategy][newVersion] = newPerformanceMetricsHash;

        uint256 tokenId = _tokenIdByStrategy[strategy];
        IStrategyNFT(strategyNFT).setVersion(tokenId, newVersion);

        emit StrategyUpdated(strategy, newVersion, newPerformanceMetricsHash);
    }

    function getTokenId(address strategy) external view returns (uint256) {
        return _tokenIdByStrategy[strategy];
    }

    function getActiveVersion(address strategy) external view returns (uint256) {
        return _meta[strategy].activeVersion;
    }

    function isActiveVersion(address strategy, uint256 version) external view returns (bool) {
        return _meta[strategy].activeVersion == version;
    }

    function getCreator(address strategy) external view returns (address) {
        return _meta[strategy].creator;
    }

    function getStrategyMeta(address strategy)
        external
        view
        returns (address creator, StrategyType strategyType, uint8 riskLevel, uint256 activeVersion, bytes32 performanceMetricsHash)
    {
        StrategyMeta storage m = _meta[strategy];
        return (m.creator, m.strategyType, m.riskLevel, m.activeVersion, m.performanceMetricsHash);
    }

    function getVersionHistory(address strategy, uint256 version) external view returns (bytes32) {
        return _versionHistory[strategy][version];
    }
}
