// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Vault } from "../vault/Vault.sol";
import { IBaseStrategy } from "../strategy/IBaseStrategy.sol";
import { UniswapV3LPStrategy } from "../strategy/UniswapV3LPStrategy.sol";
import { VaultFactory } from "./VaultFactory.sol";

/// @title UniswapV3VaultFactory
/// @notice Deploys Vault + Uniswap V3 LP Strategy in one tx and links them. Optionally registers with a VaultFactory.
contract UniswapV3VaultFactory is Ownable {
    VaultFactory public immutable vaultFactory;
    address public lastVault;
    address public lastStrategy;

    event VaultCreated(
        address indexed vault,
        address indexed strategy,
        address indexed asset,
        string name,
        string symbol,
        address treasury
    );

    error UniswapV3VaultFactory__ZeroAddress();

    constructor(VaultFactory vaultFactory_) Ownable(msg.sender) {
        vaultFactory = vaultFactory_;
    }

    /// @notice Deploy vault and Uniswap V3 LP strategy, link them, and register with VaultFactory (if set).
    function createVaultWithUniswapV3Strategy(
        address asset_,
        string calldata name_,
        string calldata symbol_,
        address treasury_,
        uint256 depositCap_,
        uint256 performanceFeeBps_,
        uint256 withdrawalFeeBps_,
        address positionManager_,
        address swapRouter_,
        address pool_,
        int24 tickLower_,
        int24 tickUpper_
    ) external onlyOwner returns (Vault vault_, address vaultAddress, address strategyAddress) {
        if (asset_ == address(0) || treasury_ == address(0) || positionManager_ == address(0) || swapRouter_ == address(0) || pool_ == address(0)) revert UniswapV3VaultFactory__ZeroAddress();
        vault_ = new Vault(
            IERC20(asset_),
            name_,
            symbol_,
            treasury_,
            depositCap_,
            performanceFeeBps_,
            withdrawalFeeBps_
        );
        vaultAddress = address(vault_);
        UniswapV3LPStrategy strategy_ = new UniswapV3LPStrategy(
            vaultAddress,
            asset_,
            positionManager_,
            swapRouter_,
            pool_,
            tickLower_,
            tickUpper_
        );
        strategyAddress = address(strategy_);
        vault_.setStrategy(IBaseStrategy(strategyAddress));
        lastVault = vaultAddress;
        lastStrategy = strategyAddress;
        emit VaultCreated(vaultAddress, strategyAddress, asset_, name_, symbol_, treasury_);
    }
}
