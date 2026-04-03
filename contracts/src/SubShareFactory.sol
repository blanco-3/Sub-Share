// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SubShareVault.sol";

/// @title SubShareFactory
/// @notice Deployed once. Users call createVault() to spin up new vaults.
///         Works with smart accounts (ERC-4337) since it's a regular function call.
contract SubShareFactory {
    event VaultCreated(
        address indexed vault,
        address indexed creator,
        string  name,
        uint256 monthlyPrice,
        uint256 nMembers,
        uint256 duration
    );

    address[] public allVaults;

    function createVault(
        address usdc,
        string  memory name,
        uint256 monthlyPrice,
        uint256 nMembers,
        uint256 duration
    ) external returns (address vault) {
        SubShareVault v = new SubShareVault(
            usdc,
            name,
            monthlyPrice,
            nMembers,
            duration,
            msg.sender   // real creator passed explicitly
        );
        allVaults.push(address(v));
        emit VaultCreated(address(v), msg.sender, name, monthlyPrice, nMembers, duration);
        return address(v);
    }

    function totalVaults() external view returns (uint256) {
        return allVaults.length;
    }
}
