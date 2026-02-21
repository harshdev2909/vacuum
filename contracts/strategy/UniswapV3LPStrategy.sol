// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { BaseStrategy } from "./BaseStrategy.sol";
import { INonfungiblePositionManager } from "../interfaces/INonfungiblePositionManager.sol";
import { IUniswapV3Pool } from "../interfaces/IUniswapV3Pool.sol";
import { IV3SwapRouter } from "../interfaces/IV3SwapRouter.sol";
import { LiquidityAmounts } from "../libraries/UniswapV3/LiquidityAmounts.sol";
import { TickMath } from "../libraries/UniswapV3/TickMath.sol";
import { FullMath } from "../libraries/UniswapV3/FullMath.sol";

/// @title UniswapV3LPStrategy
/// @notice Deploys vault asset (e.g. USDC) + paired token (e.g. WETH) into a Uniswap V3 pool. Harvests fees and swaps to asset.
contract UniswapV3LPStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    INonfungiblePositionManager public immutable positionManager;
    IV3SwapRouter public immutable swapRouter;
    IUniswapV3Pool public immutable pool;
    address public immutable token0;
    address public immutable token1;
    uint24 public immutable feeTier;
    int24 public immutable tickLower;
    int24 public immutable tickUpper;
    uint256 public positionTokenId;
    uint256 public constant MIN_SLIPPAGE_BPS = 50; // 0.5% min out

    error UniswapV3LPStrategy__NoPosition();
    error UniswapV3LPStrategy__SwapFailed();
    error UniswapV3LPStrategy__Slippage();

    constructor(
        address vault_,
        address asset_,
        address positionManager_,
        address swapRouter_,
        address pool_,
        int24 tickLower_,
        int24 tickUpper_
    ) BaseStrategy(vault_, asset_) {
        positionManager = INonfungiblePositionManager(positionManager_);
        swapRouter = IV3SwapRouter(swapRouter_);
        pool = IUniswapV3Pool(pool_);
        token0 = pool.token0();
        token1 = pool.token1();
        feeTier = pool.fee();
        tickLower = tickLower_;
        tickUpper = tickUpper_;
        positionTokenId = 0;
    }

    function _deposit(uint256 amount) internal override {
        if (amount == 0) return;
        (uint256 amount0, uint256 amount1) = _swapHalfToPaired(amount);
        _addLiquidity(amount0, amount1);
    }

    function _withdraw(uint256 amount) internal override returns (uint256 withdrawn) {
        if (amount == 0) return 0;
        uint256 assetBalance = IERC20(asset).balanceOf(address(this));
        if (positionTokenId == 0) {
            withdrawn = assetBalance < amount ? assetBalance : amount;
            return withdrawn;
        }
        (,,,,,,, uint128 liquidity,,,,) = positionManager.positions(positionTokenId);
        if (liquidity == 0) {
            withdrawn = assetBalance < amount ? assetBalance : amount;
            return withdrawn;
        }
        uint256 needFromPool = amount > assetBalance ? amount - assetBalance : 0;
        if (needFromPool > 0) {
            _decreaseLiquidityAndCollect(liquidity);
            _swapAllToAsset();
        }
        uint256 finalBalance = IERC20(asset).balanceOf(address(this));
        withdrawn = finalBalance < amount ? finalBalance : amount;
    }

    function _harvest() internal override returns (uint256 profit) {
        if (positionTokenId == 0) return 0;
        (,,,,,,, uint128 liquidity,,,,) = positionManager.positions(positionTokenId);
        if (liquidity == 0) return 0;
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        positionManager.collect(INonfungiblePositionManager.CollectParams({
            tokenId: positionTokenId,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        }));
        _swapAllToAsset();
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        profit = balanceAfter > balanceBefore ? balanceAfter - balanceBefore : 0;
    }

    function _retireStrategy() internal override {
        if (positionTokenId == 0) return;
        (,,,,,,, uint128 liquidity,,,,) = positionManager.positions(positionTokenId);
        if (liquidity > 0) {
            _decreaseLiquidityAndCollect(liquidity);
            _swapAllToAsset();
        }
        positionManager.burn(positionTokenId);
        positionTokenId = 0;
    }

    function _emergencyWithdraw() internal override {
        if (positionTokenId == 0) return;
        (,,,,,,, uint128 liquidity,,,,) = positionManager.positions(positionTokenId);
        if (liquidity > 0) {
            _decreaseLiquidityAndCollect(liquidity);
            _swapAllToAsset();
        }
        try positionManager.burn(positionTokenId) {} catch {}
        positionTokenId = 0;
        uint256 bal = IERC20(asset).balanceOf(address(this));
        if (bal > 0) IERC20(asset).safeTransfer(vault, bal);
    }

    function balanceOf() public view override returns (uint256) {
        uint256 idle = IERC20(asset).balanceOf(address(this));
        if (positionTokenId == 0) return idle;
        (,,,,,,, uint128 liquidity,,,,) = positionManager.positions(positionTokenId);
        if (liquidity == 0) return idle;
        (uint160 sqrtPriceX96,,,,,,) = pool.slot0();
        uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower);
        uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper);
        (uint256 amount0, uint256 amount1) = LiquidityAmounts.getAmountsForLiquidity(sqrtPriceX96, sqrtRatioAX96, sqrtRatioBX96, liquidity);
        uint256 positionValueInAsset = _valuePositionInAsset(amount0, amount1, sqrtPriceX96);
        return idle + positionValueInAsset;
    }

    function _valuePositionInAsset(uint256 amount0, uint256 amount1, uint160 sqrtPriceX96) internal view returns (uint256) {
        if (asset == token0) {
            return amount0 + FullMath.mulDiv(amount1, 2 ** 192, uint256(sqrtPriceX96) * sqrtPriceX96);
        } else {
            return amount1 + FullMath.mulDiv(amount0, uint256(sqrtPriceX96) * sqrtPriceX96, 2 ** 192);
        }
    }

    function _swapHalfToPaired(uint256 amountAsset) internal returns (uint256 amount0, uint256 amount1) {
        uint256 half = amountAsset / 2;
        address other = asset == token0 ? token1 : token0;
        IERC20(asset).approve(address(swapRouter), half);
        uint256 amountOut = swapRouter.exactInputSingle(IV3SwapRouter.ExactInputSingleParams({
            tokenIn: asset,
            tokenOut: other,
            fee: feeTier,
            recipient: address(this),
            amountIn: half,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        }));
        if (asset == token0) {
            amount0 = amountAsset - half;
            amount1 = amountOut;
        } else {
            amount0 = amountOut;
            amount1 = amountAsset - half;
        }
    }

    function _addLiquidity(uint256 amount0Desired, uint256 amount1Desired) internal {
        IERC20(token0).forceApprove(address(positionManager), amount0Desired);
        IERC20(token1).forceApprove(address(positionManager), amount1Desired);
        uint256 deadline = block.timestamp + 300;
        if (positionTokenId == 0) {
            (uint256 tokenId,, uint256 used0, uint256 used1) = positionManager.mint(INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: feeTier,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: amount0Desired * (10000 - MIN_SLIPPAGE_BPS) / 10000,
                amount1Min: amount1Desired * (10000 - MIN_SLIPPAGE_BPS) / 10000,
                recipient: address(this),
                deadline: deadline
            }));
            positionTokenId = tokenId;
            if (used0 < amount0Desired || used1 < amount1Desired) {
                if (IERC20(token0).balanceOf(address(this)) > 0) IERC20(token0).forceApprove(address(swapRouter), IERC20(token0).balanceOf(address(this)));
                if (IERC20(token1).balanceOf(address(this)) > 0) IERC20(token1).forceApprove(address(swapRouter), IERC20(token1).balanceOf(address(this)));
            }
        } else {
            positionManager.increaseLiquidity(INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: positionTokenId,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: 0,
                amount1Min: 0,
                deadline: deadline
            }));
        }
    }

    function _decreaseLiquidityAndCollect(uint128 liquidity) internal {
        positionManager.decreaseLiquidity(INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: positionTokenId,
            liquidity: liquidity,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp + 300
        }));
        positionManager.collect(INonfungiblePositionManager.CollectParams({
            tokenId: positionTokenId,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        }));
    }

    function _swapAllToAsset() internal {
        address other = asset == token0 ? token1 : token0;
        uint256 otherBal = IERC20(other).balanceOf(address(this));
        if (otherBal == 0) return;
        IERC20(other).forceApprove(address(swapRouter), otherBal);
        swapRouter.exactInputSingle(IV3SwapRouter.ExactInputSingleParams({
            tokenIn: other,
            tokenOut: asset,
            fee: feeTier,
            recipient: address(this),
            amountIn: otherBal,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        }));
    }
}
