// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library VaultConstants {
    uint256 internal constant BPS_DENOMINATOR = 10_000;
    uint256 internal constant MAX_PERFORMANCE_FEE_BPS = 2_000; // 20%
    uint256 internal constant MAX_WITHDRAWAL_FEE_BPS = 500;   // 5%
}
