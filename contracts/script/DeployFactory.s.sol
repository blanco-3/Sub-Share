// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SubShareFactory.sol";

contract DeployFactory is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        SubShareFactory factory = new SubShareFactory();
        console.log("SubShareFactory deployed at:", address(factory));

        vm.stopBroadcast();
    }
}
