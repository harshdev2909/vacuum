// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Phase5Constants {
    uint256 internal constant BPS_DENOMINATOR = 10_000;
    uint256 internal constant MAX_AGENT_BPS = 9_000;   // 90% max to agent
    uint256 internal constant MAX_PROTOCOL_BPS = 2_000; // 20% max to protocol
}
