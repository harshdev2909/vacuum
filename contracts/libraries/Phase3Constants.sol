// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Phase3Constants {
    uint256 internal constant BPS_DENOMINATOR = 10_000;
    uint256 internal constant MAX_ROYALTY_BPS = 2_500;   // 25% max royalty
    uint256 internal constant MAX_CREATOR_BPS = 1_000;    // 10% max creator share of revenue
    uint256 internal constant MAX_PROTOCOL_BPS = 500;     // 5% max protocol share
    uint256 internal constant MAX_AFFILIATE_BPS = 500;    // 5% max affiliate share
}
