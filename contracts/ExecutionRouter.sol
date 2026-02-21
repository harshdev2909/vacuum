// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IV3SwapRouter } from "./interfaces/IV3SwapRouter.sol";
import { IWETH } from "./interfaces/IWETH.sol";
import { FeeManager } from "./FeeManager.sol";
import { ReferralRegistry } from "./ReferralRegistry.sol";
import { WalletAuthorization } from "./WalletAuthorization.sol";
import { Constants } from "./libraries/Constants.sol";
import { IStrategyNFT } from "./interfaces/IStrategyNFT.sol";
import { IStrategyRegistry } from "./interfaces/IStrategyRegistry.sol";
import { IStrategySubscriptionManager } from "./interfaces/IStrategySubscriptionManager.sol";

/// @title ExecutionRouter
/// @notice Arbitrum-native execution layer: Uniswap V3 swaps, fees, referrals, slippage, delegate auth
contract ExecutionRouter is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    error ExecutionRouter__ZeroAddress();
    error ExecutionRouter__Expired();
    error ExecutionRouter__Slippage();
    error ExecutionRouter__Unauthorized();
    error ExecutionRouter__InvalidNonce();
    error ExecutionRouter__TransferFailed();
    error ExecutionRouter__InsufficientValue();
    error ExecutionRouter__StrategySubscriptionRequired();
    error ExecutionRouter__StrategyNFTRequired();
    error ExecutionRouter__StrategyNotActiveVersion();

    event TradeExecuted(
        address indexed user,
        address indexed executor,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeAmount,
        uint256 referralAmount,
        bytes32 indexed executionId
    );

    IV3SwapRouter public immutable uniswapRouter;
    address public immutable weth;
    FeeManager public immutable feeManager;
    ReferralRegistry public immutable referralRegistry;
    WalletAuthorization public immutable walletAuth;

    IStrategyNFT public strategyNFT;
    IStrategyRegistry public strategyRegistry;
    IStrategySubscriptionManager public subscriptionManager;

    mapping(address user => uint256) public executionNonces;

    constructor(
        address uniswapRouter_,
        address weth_,
        FeeManager feeManager_,
        ReferralRegistry referralRegistry_,
        WalletAuthorization walletAuth_
    ) Ownable(msg.sender) {
        if (
            uniswapRouter_ == address(0) || weth_ == address(0) || address(feeManager_) == address(0)
                || address(referralRegistry_) == address(0) || address(walletAuth_) == address(0)
        ) revert ExecutionRouter__ZeroAddress();
        uniswapRouter = IV3SwapRouter(uniswapRouter_);
        weth = weth_;
        feeManager = feeManager_;
        referralRegistry = referralRegistry_;
        walletAuth = walletAuth_;
    }

    function setStrategyBinding(IStrategyNFT strategyNFT_, IStrategyRegistry strategyRegistry_, IStrategySubscriptionManager subscriptionManager_) external onlyOwner {
        strategyNFT = strategyNFT_;
        strategyRegistry = strategyRegistry_;
        subscriptionManager = subscriptionManager_;
    }

    function _requireStrategyBinding(address owner, uint256 strategyTokenId) internal view {
        if (strategyTokenId == 0) return;
        if (address(strategyNFT) == address(0) || address(strategyRegistry) == address(0) || address(subscriptionManager) == address(0)) return;
        if (strategyNFT.ownerOf(strategyTokenId) != owner) revert ExecutionRouter__StrategyNFTRequired();
        if (!subscriptionManager.isSubscriptionActive(owner, strategyTokenId)) revert ExecutionRouter__StrategySubscriptionRequired();
        address strategy = strategyNFT.strategyByToken(strategyTokenId);
        uint256 version = strategyNFT.versionByToken(strategyTokenId);
        if (!strategyRegistry.isActiveVersion(strategy, version)) revert ExecutionRouter__StrategyNotActiveVersion();
    }

    /// @notice Execute exact-in single-hop swap (ERC20 or ETH in)
    function executeExactInputSingle(
        IV3SwapRouter.ExactInputSingleParams calldata params,
        uint256 deadline,
        address beneficiary,
        uint256 minAmountOutAfterFee,
        uint256 nonce
    ) external payable nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert ExecutionRouter__Expired();
        address owner = _resolveOwner(beneficiary);
        _consumeNonce(owner, nonce);
        return _doExactInputSingle(params, beneficiary, owner, minAmountOutAfterFee);
    }

    function _doExactInputSingle(
        IV3SwapRouter.ExactInputSingleParams calldata params,
        address beneficiary,
        address owner,
        uint256 minAmountOutAfterFee
    ) internal returns (uint256 amountOut) {
        if (params.tokenIn == weth && params.tokenOut == weth && msg.value >= params.amountIn) {
            if (msg.value > params.amountIn) {
                (bool ok,) = payable(msg.sender).call{ value: msg.value - params.amountIn }("");
                if (!ok) revert ExecutionRouter__TransferFailed();
            }
            IWETH(weth).deposit{ value: params.amountIn }();
            (uint256 feeAmt, uint256 refAmt, uint256 toUserAmt) = _distributeFee(weth, params.amountIn, owner);
            if (toUserAmt < minAmountOutAfterFee) revert ExecutionRouter__Slippage();
            address to = beneficiary != address(0) ? beneficiary : owner;
            IERC20(weth).safeTransfer(to, toUserAmt);
            bytes32 execId = keccak256(abi.encodePacked(owner, block.chainid, executionNonces[owner] - 1, block.timestamp));
            emit TradeExecuted(owner, msg.sender, weth, weth, params.amountIn, toUserAmt, feeAmt, refAmt, execId);
            return toUserAmt;
        }

        bool isEthIn = params.tokenIn == weth && msg.value > 0;
        uint256 amountIn = isEthIn ? msg.value : IERC20(params.tokenIn).balanceOf(address(this));
        if (!isEthIn) {
            IERC20(params.tokenIn).safeTransferFrom(owner, address(this), params.amountIn);
            amountIn = params.amountIn;
        } else if (msg.value < params.amountIn) revert ExecutionRouter__InsufficientValue();
        else if (msg.value > params.amountIn) {
            (bool ok,) = payable(msg.sender).call{ value: msg.value - params.amountIn }("");
            if (!ok) revert ExecutionRouter__TransferFailed();
        }

        if (params.tokenIn == weth && msg.value >= params.amountIn) {
            IWETH(weth).deposit{ value: params.amountIn }();
        }
        IERC20(params.tokenIn).forceApprove(address(uniswapRouter), params.amountIn);

        uint256 balanceOutBefore = IERC20(params.tokenOut).balanceOf(address(this));
        amountOut = uniswapRouter.exactInputSingle(
            IV3SwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                fee: params.fee,
                recipient: address(this),
                amountIn: params.amountIn,
                amountOutMinimum: params.amountOutMinimum,
                sqrtPriceLimitX96: params.sqrtPriceLimitX96
            })
        );
        uint256 received = IERC20(params.tokenOut).balanceOf(address(this)) - balanceOutBefore;
        if (received < params.amountOutMinimum) revert ExecutionRouter__Slippage();

        (uint256 feeAmount, uint256 referralAmount, uint256 toUser) = _distributeFee(params.tokenOut, received, owner);
        if (toUser < minAmountOutAfterFee) revert ExecutionRouter__Slippage();

        _sendOutput(params.tokenOut, beneficiary != address(0) ? beneficiary : owner, toUser);

        bytes32 executionId = keccak256(abi.encodePacked(owner, block.chainid, executionNonces[owner] - 1, block.timestamp));
        emit TradeExecuted(owner, msg.sender, params.tokenIn, params.tokenOut, params.amountIn, toUser, feeAmount, referralAmount, executionId);
        return toUser;
    }

    /// @notice Execute exact-in single-hop swap with strategy binding (subscription + NFT + active version)
    function executeExactInputSingleWithStrategy(
        IV3SwapRouter.ExactInputSingleParams calldata params,
        uint256 deadline,
        address beneficiary,
        uint256 minAmountOutAfterFee,
        uint256 nonce,
        uint256 strategyTokenId
    ) external payable nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert ExecutionRouter__Expired();
        address owner = _resolveOwner(beneficiary);
        _consumeNonce(owner, nonce);
        _requireStrategyBinding(owner, strategyTokenId);
        return _doExactInputSingle(params, beneficiary, owner, minAmountOutAfterFee);
    }

    /// @notice Execute exact-in multi-hop swap
    function executeExactInput(
        IV3SwapRouter.ExactInputParams calldata params,
        uint256 deadline,
        address beneficiary,
        address tokenIn,
        uint256 /* amountInSupplied */,
        uint256 minAmountOutAfterFee,
        uint256 nonce
    ) external payable nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert ExecutionRouter__Expired();
        address owner = _resolveOwner(beneficiary);
        _consumeNonce(owner, nonce);

        bool isEthIn = tokenIn == weth && msg.value > 0;
        if (!isEthIn) {
            IERC20(tokenIn).safeTransferFrom(owner, address(this), params.amountIn);
        } else {
            if (msg.value < params.amountIn) revert ExecutionRouter__InsufficientValue();
            IWETH(weth).deposit{ value: params.amountIn }();
            if (msg.value > params.amountIn) {
                (bool ok,) = payable(msg.sender).call{ value: msg.value - params.amountIn }("");
                if (!ok) revert ExecutionRouter__TransferFailed();
            }
        }
        IERC20(tokenIn).forceApprove(address(uniswapRouter), params.amountIn);

        address tokenOut = _lastTokenInPath(params.path);
        uint256 balanceOutBefore = IERC20(tokenOut).balanceOf(address(this));
        amountOut = uniswapRouter.exactInput(
            IV3SwapRouter.ExactInputParams({
                path: params.path,
                recipient: address(this),
                amountIn: params.amountIn,
                amountOutMinimum: params.amountOutMinimum
            })
        );
        uint256 received = IERC20(tokenOut).balanceOf(address(this)) - balanceOutBefore;
        if (received < params.amountOutMinimum) revert ExecutionRouter__Slippage();

        (uint256 feeAmount, uint256 referralAmount, uint256 toUser) = _distributeFee(tokenOut, received, owner);
        if (toUser < minAmountOutAfterFee) revert ExecutionRouter__Slippage();

        _sendOutput(tokenOut, beneficiary != address(0) ? beneficiary : owner, toUser);

        bytes32 executionId = keccak256(abi.encodePacked(owner, block.chainid, executionNonces[owner] - 1, block.timestamp));
        emit TradeExecuted(owner, msg.sender, tokenIn, tokenOut, params.amountIn, toUser, feeAmount, referralAmount, executionId);
        return toUser;
    }

    /// @notice Execute exact-out single-hop swap
    function executeExactOutputSingle(
        IV3SwapRouter.ExactOutputSingleParams calldata params,
        uint256 deadline,
        address beneficiary,
        uint256 maxAmountInAfterFee,
        uint256 nonce
    ) external payable nonReentrant whenNotPaused returns (uint256 amountIn) {
        if (block.timestamp > deadline) revert ExecutionRouter__Expired();
        address owner = _resolveOwner(beneficiary);
        _consumeNonce(owner, nonce);

        bool isEthIn = params.tokenIn == weth && msg.value > 0;
        if (!isEthIn) {
            IERC20(params.tokenIn).safeTransferFrom(owner, address(this), params.amountInMaximum);
        } else {
            if (msg.value < params.amountInMaximum) revert ExecutionRouter__InsufficientValue();
            IWETH(weth).deposit{ value: msg.value }();
        }
        IERC20(params.tokenIn).forceApprove(address(uniswapRouter), params.amountInMaximum);

        uint256 balanceOutBefore = IERC20(params.tokenOut).balanceOf(address(this));
        amountIn = uniswapRouter.exactOutputSingle(
            IV3SwapRouter.ExactOutputSingleParams({
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                fee: params.fee,
                recipient: address(this),
                amountOut: params.amountOut,
                amountInMaximum: params.amountInMaximum,
                sqrtPriceLimitX96: params.sqrtPriceLimitX96
            })
        );
        uint256 receivedOut = IERC20(params.tokenOut).balanceOf(address(this)) - balanceOutBefore;
        if (receivedOut < params.amountOut) revert ExecutionRouter__Slippage();

        (uint256 feeAmount, uint256 referralAmount, uint256 toUser) = _distributeFee(params.tokenOut, receivedOut, owner);
        if (amountIn > maxAmountInAfterFee) revert ExecutionRouter__Slippage();

        _refundExcessInput(params.tokenIn, owner, params.amountInMaximum, amountIn, isEthIn);
        _sendOutput(params.tokenOut, beneficiary != address(0) ? beneficiary : owner, toUser);

        bytes32 executionId = keccak256(abi.encodePacked(owner, block.chainid, executionNonces[owner] - 1, block.timestamp));
        emit TradeExecuted(owner, msg.sender, params.tokenIn, params.tokenOut, amountIn, toUser, feeAmount, referralAmount, executionId);
        return amountIn;
    }

    /// @notice Execute exact-out multi-hop swap
    function executeExactOutput(
        IV3SwapRouter.ExactOutputParams calldata params,
        uint256 deadline,
        address beneficiary,
        address tokenIn,
        uint256 /* maxAmountInSupplied */,
        uint256 nonce
    ) external payable nonReentrant whenNotPaused returns (uint256 amountIn) {
        if (block.timestamp > deadline) revert ExecutionRouter__Expired();
        address owner = _resolveOwner(beneficiary);
        _consumeNonce(owner, nonce);

        bool isEthIn = tokenIn == weth && msg.value > 0;
        if (!isEthIn) {
            IERC20(tokenIn).safeTransferFrom(owner, address(this), params.amountInMaximum);
        } else {
            if (msg.value < params.amountInMaximum) revert ExecutionRouter__InsufficientValue();
            IWETH(weth).deposit{ value: msg.value }();
        }
        IERC20(tokenIn).forceApprove(address(uniswapRouter), params.amountInMaximum);

        address tokenOut = _firstTokenInExactOutputPath(params.path);
        uint256 balanceOutBefore = IERC20(tokenOut).balanceOf(address(this));
        amountIn = uniswapRouter.exactOutput(
            IV3SwapRouter.ExactOutputParams({
                path: params.path,
                recipient: address(this),
                amountOut: params.amountOut,
                amountInMaximum: params.amountInMaximum
            })
        );
        uint256 receivedOut = IERC20(tokenOut).balanceOf(address(this)) - balanceOutBefore;
        if (receivedOut < params.amountOut) revert ExecutionRouter__Slippage();

        (uint256 feeAmount, uint256 referralAmount, uint256 toUser) = _distributeFee(tokenOut, receivedOut, owner);

        _refundExcessInput(tokenIn, owner, params.amountInMaximum, amountIn, isEthIn);
        _sendOutput(tokenOut, beneficiary != address(0) ? beneficiary : owner, toUser);

        bytes32 executionId = keccak256(abi.encodePacked(owner, block.chainid, executionNonces[owner] - 1, block.timestamp));
        emit TradeExecuted(owner, msg.sender, tokenIn, tokenOut, amountIn, toUser, feeAmount, referralAmount, executionId);
        return amountIn;
    }

    function _resolveOwner(address beneficiary) internal view returns (address owner) {
        if (beneficiary != address(0)) {
            if (!walletAuth.isAuthorized(beneficiary, msg.sender)) revert ExecutionRouter__Unauthorized();
            return beneficiary;
        }
        return msg.sender;
    }

    function _consumeNonce(address owner, uint256 nonce) internal {
        if (nonce != executionNonces[owner]) revert ExecutionRouter__InvalidNonce();
        executionNonces[owner]++;
    }

    function _distributeFee(address tokenOut, uint256 amountOut, address from)
        internal
        returns (uint256 feeAmount, uint256 referralAmount, uint256 toUser)
    {
        feeAmount = (amountOut * feeManager.protocolFeeBps()) / Constants.BPS_DENOMINATOR;
        referralAmount = (feeAmount * feeManager.referralSplitBps()) / Constants.BPS_DENOMINATOR;
        toUser = amountOut - feeAmount;

        address referrer = referralRegistry.referrerOf(from);
        if (referrer != address(0) && referralAmount > 0) {
            IERC20(tokenOut).safeTransfer(address(referralRegistry), referralAmount);
            referralRegistry.creditReward(referrer, tokenOut, referralAmount);
        }
        uint256 toTreasury = feeAmount - referralAmount;
        if (toTreasury > 0) {
            IERC20(tokenOut).safeTransfer(feeManager.treasury(), toTreasury);
        }
        feeManager.recordFeeCollected(tokenOut, from, feeAmount, referralAmount);
    }

    function _sendOutput(address token, address to, uint256 amount) internal {
        if (token == weth) {
            IWETH(weth).withdraw(amount);
            (bool ok,) = payable(to).call{ value: amount }("");
            if (!ok) revert ExecutionRouter__TransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function _refundExcessInput(address tokenIn, address owner, uint256 maxIn, uint256 used, bool wasEthIn) internal {
        uint256 excess = maxIn - used;
        if (excess == 0) return;
        if (tokenIn == weth && wasEthIn) {
            IWETH(weth).withdraw(excess);
            (bool ok,) = payable(owner).call{ value: excess }("");
            if (!ok) revert ExecutionRouter__TransferFailed();
        } else {
            IERC20(tokenIn).safeTransfer(owner, excess);
        }
    }

    function _lastTokenInPath(bytes memory path) internal pure returns (address) {
        uint256 pathLen = path.length;
        require(pathLen >= 20, "path");
        uint256 tokenWord;
        assembly {
            tokenWord := mload(add(add(path, 32), sub(pathLen, 20)))
        }
        return address(uint160(tokenWord));
    }

    function _firstTokenInExactOutputPath(bytes memory path) internal pure returns (address) {
        require(path.length >= 20, "path");
        uint256 tokenWord;
        assembly {
            tokenWord := mload(add(path, 32))
        }
        return address(uint160(tokenWord));
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable { }
}
