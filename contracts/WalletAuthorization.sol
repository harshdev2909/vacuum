// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title WalletAuthorization
/// @notice EIP-712 signature-based delegate authorization with nonce and revoke
contract WalletAuthorization is Ownable, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DELEGATE_AUTHORIZATION_TYPEHASH = keccak256(
        "DelegateAuthorization(address owner,address delegate,uint256 nonce,uint256 deadline)"
    );

    error WalletAuthorization__Expired();
    error WalletAuthorization__InvalidSignature();
    error WalletAuthorization__ZeroAddress();

    event DelegateAuthorized(address indexed owner, address indexed delegate);
    event DelegateRevoked(address indexed owner, address indexed delegate);

    mapping(address owner => mapping(address delegate => bool)) private _isAuthorized;
    mapping(address owner => uint256) public nonces;

    constructor() EIP712("ArbiExecutionLayer", "1") Ownable(msg.sender) { }

    /// @notice Authorize a delegate via EIP-712 signature
    function authorizeDelegate(address owner, address delegate, uint256 deadline, bytes calldata signature) external {
        if (owner == address(0) || delegate == address(0)) revert WalletAuthorization__ZeroAddress();
        if (block.timestamp > deadline) revert WalletAuthorization__Expired();
        uint256 nonce = nonces[owner];
        bytes32 structHash = keccak256(abi.encode(DELEGATE_AUTHORIZATION_TYPEHASH, owner, delegate, nonce, deadline));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);
        if (signer != owner) revert WalletAuthorization__InvalidSignature();
        nonces[owner]++;
        _isAuthorized[owner][delegate] = true;
        emit DelegateAuthorized(owner, delegate);
    }

    /// @notice Revoke delegate (callable by owner only)
    function revokeDelegate(address delegate) external {
        if (delegate == address(0)) revert WalletAuthorization__ZeroAddress();
        if (!_isAuthorized[msg.sender][delegate]) return;
        _isAuthorized[msg.sender][delegate] = false;
        emit DelegateRevoked(msg.sender, delegate);
    }

    function isAuthorized(address owner, address delegate) external view returns (bool) {
        return _isAuthorized[owner][delegate];
    }

    function domainSeparatorV4() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
