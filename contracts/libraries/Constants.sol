// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Constants for Arbitrum execution layer
library Constants {
    uint256 internal constant MAX_FEE_BPS = 200; // 2% max protocol fee
    uint256 internal constant BPS_DENOMINATOR = 10_000;
    uint256 internal constant REFERRAL_BPS_DENOMINATOR = 10_000;
    uint160 internal constant SQRT_PRICE_LIMIT_X96_ZERO = 0;
}
