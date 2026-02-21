// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IExecutionRouter } from "../interfaces/IExecutionRouter.sol";
import { IV3SwapRouter } from "../interfaces/IV3SwapRouter.sol";
import { RiskGuard } from "./RiskGuard.sol";
import { IBaseStrategy } from "../strategy/IBaseStrategy.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title TreasuryAutomationController
/// @notice Connects to ExecutionRouter and Vaults; executes whitelisted strategies; enforces risk limits; tracks exposure
contract TreasuryAutomationController is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    error TreasuryAutomationController__ZeroAddress();
    error TreasuryAutomationController__ExecutionFailed();
    error TreasuryAutomationController__NoRiskGuard();

    event ExecutionPerformed(
        address indexed treasury,
        address indexed target,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bytes32 indexed executionId
    );
    event VaultHarvestPerformed(address indexed vault, uint256 profit, uint256 feeTaken);
    event ExposureUpdated(address indexed token, uint256 amount);
    event ExecutionRouterSet(address indexed router);
    event RiskGuardSet(address indexed riskGuard);
    event TreasurySet(address indexed treasury);

    IExecutionRouter public executionRouter;
    RiskGuard public riskGuard;
    address public treasury;

    mapping(address => uint256) public exposureByToken;
    mapping(address => bool) public whitelistedVaults;

    constructor(address owner_) Ownable(owner_) { }

    function setExecutionRouter(address router_) external onlyOwner {
        if (router_ == address(0)) revert TreasuryAutomationController__ZeroAddress();
        executionRouter = IExecutionRouter(router_);
        emit ExecutionRouterSet(router_);
    }

    function setRiskGuard(address riskGuard_) external onlyOwner {
        if (riskGuard_ == address(0)) revert TreasuryAutomationController__ZeroAddress();
        riskGuard = RiskGuard(payable(riskGuard_));
        emit RiskGuardSet(riskGuard_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    function setVaultWhitelisted(address vault_, bool allowed_) external onlyOwner {
        whitelistedVaults[vault_] = allowed_;
    }

    /// @notice Execute a swap via ExecutionRouter on behalf of treasury. Treasury must approve router and authorize this controller (WalletAuth). Send msg.value when tokenIn is WETH (ETH-in).
    function executeAutomatedSwap(
        IV3SwapRouter.ExactInputSingleParams calldata params_,
        uint256 deadline_,
        uint256 minAmountOutAfterFee_,
        uint256 expectedAmountOut_
    ) external payable onlyOwner nonReentrant returns (uint256 amountOut) {
        if (address(riskGuard) == address(0)) revert TreasuryAutomationController__NoRiskGuard();
        if (address(executionRouter) == address(0) || treasury == address(0)) revert TreasuryAutomationController__ZeroAddress();

        riskGuard.validateExecution(address(executionRouter), params_.amountIn, minAmountOutAfterFee_, expectedAmountOut_);

        uint256 nonce = executionRouter.executionNonces(treasury);
        amountOut = executionRouter.executeExactInputSingle{ value: msg.value }(
            params_,
            deadline_,
            treasury,
            minAmountOutAfterFee_,
            nonce
        );

        riskGuard.recordSpend(params_.amountIn);
        exposureByToken[params_.tokenOut] += amountOut;
        emit ExposureUpdated(params_.tokenOut, exposureByToken[params_.tokenOut]);

        bytes32 executionId = keccak256(abi.encodePacked(treasury, block.chainid, nonce, block.timestamp));
        emit ExecutionPerformed(treasury, address(executionRouter), params_.tokenIn, params_.tokenOut, params_.amountIn, amountOut, executionId);
        return amountOut;
    }

    /// @notice Execute vault harvest for a whitelisted vault
    function executeVaultHarvest(address vault_) external onlyOwner nonReentrant {
        if (!whitelistedVaults[vault_]) revert TreasuryAutomationController__ZeroAddress();
        (bool success,) = vault_.call(abi.encodeWithSignature("harvest()"));
        if (!success) revert TreasuryAutomationController__ExecutionFailed();
        emit VaultHarvestPerformed(vault_, 0, 0);
    }

    /// @notice Update exposure (e.g. after manual reconciliation). Owner only.
    function setExposure(address token_, uint256 amount_) external onlyOwner {
        exposureByToken[token_] = amount_;
        emit ExposureUpdated(token_, amount_);
    }
}
