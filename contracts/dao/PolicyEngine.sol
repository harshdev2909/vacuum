// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Phase4Constants } from "../libraries/Phase4Constants.sol";

/// @title PolicyEngine
/// @notice Stores rules, evaluates conditions, allows off-chain keeper triggering, validates execution limits
contract PolicyEngine is Ownable {
    error PolicyEngine__ZeroAddress();
    error PolicyEngine__RuleNotFound();
    error PolicyEngine__ConditionNotMet();
    error PolicyEngine__ExecutionLimitReached();
    error PolicyEngine__InvalidRule();

    event RuleCreated(bytes32 indexed ruleId, uint8 conditionType, bytes conditionParams, uint256 executionLimitPerPeriod, uint256 periodSeconds);
    event RuleUpdated(bytes32 indexed ruleId, uint8 conditionType, bytes conditionParams, uint256 executionLimitPerPeriod, uint256 periodSeconds);
    event RuleTriggered(bytes32 indexed ruleId, address indexed triggeredBy, uint256 timestamp, bytes executionPayload);
    event RuleDisabled(bytes32 indexed ruleId);

    enum ConditionType {
        Always,           // 0: always pass (time-based trigger from off-chain)
        TimestampAfter,  // 1: block.timestamp >= param (uint256)
        IntervalElapsed  // 2: (block.timestamp - lastTriggerTime) >= param (uint256 interval seconds)
    }

    struct Rule {
        bool exists;
        bool disabled;
        uint8 conditionType;
        bytes conditionParams;
        uint256 executionLimitPerPeriod;
        uint256 periodSeconds;
        uint256 executionsInCurrentPeriod;
        uint256 periodStartTimestamp;
        uint256 lastTriggerTimestamp;
    }

    mapping(bytes32 => Rule) public rules;
    bytes32[] private _ruleIds;
    address public keeper;

    constructor(address owner_) Ownable(owner_) { }

    function setKeeper(address keeper_) external onlyOwner {
        keeper = keeper_;
    }

    /// @notice Create or replace a rule
    function setRule(
        bytes32 ruleId_,
        uint8 conditionType_,
        bytes calldata conditionParams_,
        uint256 executionLimitPerPeriod_,
        uint256 periodSeconds_
    ) external onlyOwner {
        if (conditionType_ > uint8(ConditionType.IntervalElapsed)) revert PolicyEngine__InvalidRule();
        if (!rules[ruleId_].exists) _ruleIds.push(ruleId_);
        rules[ruleId_] = Rule({
            exists: true,
            disabled: false,
            conditionType: conditionType_,
            conditionParams: conditionParams_,
            executionLimitPerPeriod: executionLimitPerPeriod_,
            periodSeconds: periodSeconds_,
            executionsInCurrentPeriod: rules[ruleId_].exists ? rules[ruleId_].executionsInCurrentPeriod : 0,
            periodStartTimestamp: rules[ruleId_].exists ? rules[ruleId_].periodStartTimestamp : block.timestamp,
            lastTriggerTimestamp: rules[ruleId_].exists ? rules[ruleId_].lastTriggerTimestamp : 0
        });
        emit RuleCreated(ruleId_, conditionType_, conditionParams_, executionLimitPerPeriod_, periodSeconds_);
    }

    function disableRule(bytes32 ruleId_) external onlyOwner {
        if (!rules[ruleId_].exists) revert PolicyEngine__RuleNotFound();
        rules[ruleId_].disabled = true;
        emit RuleDisabled(ruleId_);
    }

    /// @notice Evaluate condition for a rule (view)
    function evaluateCondition(bytes32 ruleId_) external view returns (bool) {
        Rule storage r = rules[ruleId_];
        if (!r.exists || r.disabled) return false;
        if (_isNewPeriod(r)) return false; // consider period reset; execution count would reset on next trigger
        if (r.executionsInCurrentPeriod >= r.executionLimitPerPeriod) return false;

        if (r.conditionType == uint8(ConditionType.Always)) return true;
        if (r.conditionType == uint8(ConditionType.TimestampAfter)) {
            if (r.conditionParams.length < 32) return false;
            uint256 threshold = abi.decode(r.conditionParams, (uint256));
            return block.timestamp >= threshold;
        }
        if (r.conditionType == uint8(ConditionType.IntervalElapsed)) {
            if (r.conditionParams.length < 32) return block.timestamp >= r.lastTriggerTimestamp;
            uint256 interval = abi.decode(r.conditionParams, (uint256));
            return block.timestamp >= r.lastTriggerTimestamp + interval;
        }
        return false;
    }

    /// @notice Keeper or anyone can trigger; evaluates condition and execution limit, updates state, emits RuleTriggered
    function triggerRule(bytes32 ruleId_, bytes calldata executionPayload_) external returns (bool) {
        Rule storage r = rules[ruleId_];
        if (!r.exists || r.disabled) revert PolicyEngine__RuleNotFound();

        if (block.timestamp >= r.periodStartTimestamp + r.periodSeconds) {
            r.periodStartTimestamp = block.timestamp;
            r.executionsInCurrentPeriod = 0;
        }
        if (r.executionsInCurrentPeriod >= r.executionLimitPerPeriod) revert PolicyEngine__ExecutionLimitReached();

        if (r.conditionType == uint8(ConditionType.Always)) { }
        else if (r.conditionType == uint8(ConditionType.TimestampAfter)) {
            uint256 threshold = r.conditionParams.length >= 32 ? abi.decode(r.conditionParams, (uint256)) : 0;
            if (block.timestamp < threshold) revert PolicyEngine__ConditionNotMet();
        } else if (r.conditionType == uint8(ConditionType.IntervalElapsed)) {
            uint256 interval = r.conditionParams.length >= 32 ? abi.decode(r.conditionParams, (uint256)) : 0;
            if (block.timestamp < r.lastTriggerTimestamp + interval) revert PolicyEngine__ConditionNotMet();
        }

        r.executionsInCurrentPeriod++;
        r.lastTriggerTimestamp = block.timestamp;
        emit RuleTriggered(ruleId_, msg.sender, block.timestamp, executionPayload_);
        return true;
    }

    function _isNewPeriod(Rule storage r) internal view returns (bool) {
        return block.timestamp >= r.periodStartTimestamp + r.periodSeconds;
    }

    function getRuleIds() external view returns (bytes32[] memory) {
        return _ruleIds;
    }

    function getRule(bytes32 ruleId_) external view returns (Rule memory) {
        return rules[ruleId_];
    }
}
