// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IStrategyNFT } from "../interfaces/IStrategyNFT.sol";
import { RoyaltyDistributor } from "../royalty/RoyaltyDistributor.sol";

/// @title StrategyMarketplace
/// @notice Fixed-price listing and purchase of Strategy NFTs. Royalties distributed via RoyaltyDistributor.
contract StrategyMarketplace is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    error StrategyMarketplace__ZeroAddress();
    error StrategyMarketplace__NotListed();
    error StrategyMarketplace__NotSeller();
    error StrategyMarketplace__InsufficientPayment();
    error StrategyMarketplace__TransferFailed();

    event ListingCreated(uint256 indexed tokenId, address indexed seller, address paymentToken, uint256 price);
    event ListingCancelled(uint256 indexed tokenId);
    event ListingSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, address paymentToken, uint256 price, uint256 royaltyAmount);

    IStrategyNFT public immutable strategyNFT;
    RoyaltyDistributor public immutable royaltyDistributor;

    struct Listing {
        address seller;
        address paymentToken;
        uint256 price;
    }
    mapping(uint256 tokenId => Listing) public listings;

    constructor(address strategyNFT_, address royaltyDistributor_) Ownable(msg.sender) {
        if (strategyNFT_ == address(0) || royaltyDistributor_ == address(0)) revert StrategyMarketplace__ZeroAddress();
        strategyNFT = IStrategyNFT(strategyNFT_);
        royaltyDistributor = RoyaltyDistributor(payable(royaltyDistributor_));
    }

    function list(uint256 tokenId, address paymentToken, uint256 price) external {
        if (paymentToken == address(0)) revert StrategyMarketplace__ZeroAddress();
        if (strategyNFT.ownerOf(tokenId) != msg.sender) revert StrategyMarketplace__NotSeller();

        listings[tokenId] = Listing({ seller: msg.sender, paymentToken: paymentToken, price: price });
        emit ListingCreated(tokenId, msg.sender, paymentToken, price);
    }

    function cancelListing(uint256 tokenId) external {
        if (listings[tokenId].seller != msg.sender) revert StrategyMarketplace__NotSeller();
        delete listings[tokenId];
        emit ListingCancelled(tokenId);
    }

    function buy(uint256 tokenId, address affiliate) external nonReentrant {
        Listing storage l = listings[tokenId];
        if (l.seller == address(0)) revert StrategyMarketplace__NotListed();
        if (l.price == 0) revert StrategyMarketplace__InsufficientPayment();

        address seller = l.seller;
        address paymentToken = l.paymentToken;
        uint256 price = l.price;

        delete listings[tokenId];

        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), price);

        address creator = strategyNFT.creatorByToken(tokenId);
        (, uint256 royaltyAmount) = strategyNFT.royaltyInfo(tokenId, price);

        if (royaltyAmount > 0) {
            IERC20(paymentToken).forceApprove(address(royaltyDistributor), royaltyAmount);
            royaltyDistributor.receivePayment(paymentToken, creator, affiliate, royaltyAmount);
        }

        uint256 toSeller = price - royaltyAmount;
        if (toSeller > 0) {
            IERC20(paymentToken).safeTransfer(seller, toSeller);
        }

        strategyNFT.transferFrom(seller, msg.sender, tokenId);

        emit ListingSold(tokenId, seller, msg.sender, paymentToken, price, royaltyAmount);
    }

    function getListing(uint256 tokenId) external view returns (address seller, address paymentToken, uint256 price) {
        Listing storage l = listings[tokenId];
        return (l.seller, l.paymentToken, l.price);
    }
}
