// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Vault } from "../vault/Vault.sol";
import { IBaseStrategy } from "../strategy/IBaseStrategy.sol";

/// @title VaultFactory
/// @notice Deploys Vaults. Tracks all deployed vaults. Use UniswapV3VaultFactory for vault+UniswapV3 strategy.
contract VaultFactory is Ownable {
    Vault[] public vaults;
    mapping(address => bool) public isVault;

    event VaultCreated(
        address indexed vault,
        address indexed strategy,
        address indexed asset,
        string name,
        string symbol,
        address treasury
    );

    error VaultFactory__ZeroAddress();

    constructor() Ownable(msg.sender) {}

    /// @notice Deploy a new vault (no strategy). Owner can set strategy later.
    function createVault(
        address asset_,
        string calldata name_,
        string calldata symbol_,
        address treasury_,
        uint256 depositCap_,
        uint256 performanceFeeBps_,
        uint256 withdrawalFeeBps_
    ) external onlyOwner returns (Vault vault_, address vaultAddress) {
        if (asset_ == address(0) || treasury_ == address(0)) revert VaultFactory__ZeroAddress();
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
        vaults.push(vault_);
        isVault[vaultAddress] = true;
        emit VaultCreated(vaultAddress, address(0), asset_, name_, symbol_, treasury_);
    }

    /// @notice Deploy vault and link pre-deployed strategy (strategy must have vault set to this new vault).
    function createVaultWithStrategy(
        address asset_,
        string calldata name_,
        string calldata symbol_,
        address treasury_,
        uint256 depositCap_,
        uint256 performanceFeeBps_,
        uint256 withdrawalFeeBps_,
        IBaseStrategy strategy_
    ) external onlyOwner returns (Vault vault_, address vaultAddress, address strategyAddress) {
        if (asset_ == address(0) || treasury_ == address(0) || address(strategy_) == address(0)) revert VaultFactory__ZeroAddress();
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
        strategyAddress = address(strategy_);
        if (address(strategy_.vault()) != vaultAddress) revert VaultFactory__ZeroAddress();
        vault_.setStrategy(strategy_);
        vaults.push(vault_);
        isVault[vaultAddress] = true;
        emit VaultCreated(vaultAddress, strategyAddress, asset_, name_, symbol_, treasury_);
    }

    function vaultCount() external view returns (uint256) {
        return vaults.length;
    }

    function getVaultAt(uint256 index) external view returns (address) {
        return address(vaults[index]);
    }

    /// @notice Register an externally created vault (e.g. from UniswapV3VaultFactory). Only owner.
    function registerVault(Vault vault_) external onlyOwner {
        if (address(vault_) == address(0)) revert VaultFactory__ZeroAddress();
        vaults.push(vault_);
        isVault[address(vault_)] = true;
    }
}
