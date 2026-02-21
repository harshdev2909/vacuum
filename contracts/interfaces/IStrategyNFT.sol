// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IStrategyNFT
/// @notice Interface for Strategy NFT (ERC721 + strategy metadata)
interface IStrategyNFT {
    function mint(address to, address strategy, address creator, uint256 version, string calldata metadataURI) external returns (uint256 tokenId);
    function setVersion(uint256 tokenId, uint256 version) external;
    function strategyByToken(uint256 tokenId) external view returns (address strategy);
    function versionByToken(uint256 tokenId) external view returns (uint256 version);
    function creatorByToken(uint256 tokenId) external view returns (address creator);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount);
}
