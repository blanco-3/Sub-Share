// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SubShareVault.sol";

contract DeployVault is Script {
    // Base Sepolia USDC
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // Example vault: Claude Max 20x, $200/mo, 4 members, 3 months
        // USDC has 6 decimals → $200 = 200_000_000
        SubShareVault vault = new SubShareVault(
            USDC,
            "Claude Max 20x",
            200_000_000,  // $200.00 USDC
            4,            // 4 members
            3,            // 3 months
            msg.sender    // creator
        );

        console.log("SubShareVault deployed at:", address(vault));
        console.log("depositPerPerson:", vault.depositPerPerson());
        console.log("  = $", vault.depositPerPerson() / 1e6, "USDC");

        vm.stopBroadcast();
    }
}
