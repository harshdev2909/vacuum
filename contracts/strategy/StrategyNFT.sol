// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC2981 } from "@openzeppelin/contracts/token/common/ERC2981.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title StrategyNFT
/// @notice ERC721 + ERC2981 for tokenized strategies. Minted when strategy is registered.
contract StrategyNFT is ERC721, ERC2981, Ownable {
    error StrategyNFT__OnlyRegistry();
    error StrategyNFT__ZeroAddress();
    error StrategyNFT__RoyaltyTooHigh();
    error StrategyNFT__RegistryAlreadySet();

    event StrategyMinted(uint256 indexed tokenId, address indexed strategy, address indexed creator, uint256 version, string metadataURI);

    uint256 private _nextTokenId;
    address public registry;

    struct TokenData {
        address strategy;
        address creator;
        uint256 version;
        string metadataURI;
    }
    mapping(uint256 tokenId => TokenData) private _tokenData;

    uint96 public royaltyBps; // basis points, max 2500 (25%)

    modifier onlyRegistry() {
        if (msg.sender != registry) revert StrategyNFT__OnlyRegistry();
        _;
    }

    constructor(uint96 royaltyBps_) ERC721("Strategy NFT", "STRAT") Ownable(msg.sender) {
        if (royaltyBps_ > 2500) revert StrategyNFT__RoyaltyTooHigh();
        royaltyBps = royaltyBps_;
        _nextTokenId = 1;
    }

    function setRegistry(address registry_) external onlyOwner {
        if (registry != address(0)) revert StrategyNFT__RegistryAlreadySet();
        if (registry_ == address(0)) revert StrategyNFT__ZeroAddress();
        registry = registry_;
    }

    function mint(address to, address strategy, address creator, uint256 version, string calldata metadataURI)
        external
        onlyRegistry
        returns (uint256 tokenId)
    {
        if (to == address(0) || strategy == address(0) || creator == address(0)) revert StrategyNFT__ZeroAddress();
        tokenId = _nextTokenId++;
        _tokenData[tokenId] = TokenData({ strategy: strategy, creator: creator, version: version, metadataURI: metadataURI });
        _safeMint(to, tokenId);
        emit StrategyMinted(tokenId, strategy, creator, version, metadataURI);
    }

    function setVersion(uint256 tokenId, uint256 version) external onlyRegistry {
        _tokenData[tokenId].version = version;
    }

    function strategyByToken(uint256 tokenId) external view returns (address) {
        return _tokenData[tokenId].strategy;
    }

    function versionByToken(uint256 tokenId) external view returns (uint256) {
        return _tokenData[tokenId].version;
    }

    function creatorByToken(uint256 tokenId) external view returns (address) {
        return _tokenData[tokenId].creator;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenData[tokenId].metadataURI;
    }

    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        public
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        _requireOwned(tokenId);
        receiver = _tokenData[tokenId].creator;
        royaltyAmount = (salePrice * royaltyBps) / 10_000;
    }

    function setRoyaltyBps(uint96 royaltyBps_) external onlyOwner {
        if (royaltyBps_ > 2500) revert StrategyNFT__RoyaltyTooHigh();
        royaltyBps = royaltyBps_;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981) returns (bool) {
        return ERC721.supportsInterface(interfaceId) || ERC2981.supportsInterface(interfaceId);
    }
}
