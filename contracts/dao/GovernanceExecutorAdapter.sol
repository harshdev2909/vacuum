// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title GovernanceExecutorAdapter
/// @notice Allows Governor / Timelock to call execution; restricts unauthorized calls (timelock pattern)
contract GovernanceExecutorAdapter is Ownable {
    error GovernanceExecutorAdapter__Unauthorized();
    error GovernanceExecutorAdapter__ExecutionFailed();
    error GovernanceExecutorAdapter__ZeroAddress();

    event ExecutorSet(address indexed executor);
    event ExecutionScheduled(bytes32 indexed proposalId, address target, uint256 value, bytes data);
    event ExecutionPerformed(address indexed target, uint256 value, bool success);

    address public executor;

    constructor(address owner_) Ownable(owner_) { }

    /// @notice Set the only address allowed to call execute (e.g. TimelockController)
    function setExecutor(address executor_) external onlyOwner {
        if (executor_ == address(0)) revert GovernanceExecutorAdapter__ZeroAddress();
        executor = executor_;
        emit ExecutorSet(executor_);
    }

    /// @notice Execute a call. Only callable by the configured executor (Governor/Timelock).
    /// @param target_ Contract to call
    /// @param value_ ETH to send
    /// @param data_ Calldata
    function execute(address target_, uint256 value_, bytes calldata data_) external returns (bytes memory) {
        if (msg.sender != executor) revert GovernanceExecutorAdapter__Unauthorized();
        if (target_ == address(0)) revert GovernanceExecutorAdapter__ZeroAddress();

        (bool success, bytes memory result) = target_.call{ value: value_ }(data_);
        emit ExecutionPerformed(target_, value_, success);
        if (!success) {
            if (result.length > 0) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
            revert GovernanceExecutorAdapter__ExecutionFailed();
        }
        return result;
    }

    receive() external payable { }
}
