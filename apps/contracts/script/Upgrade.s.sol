// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ForexSprintVault} from "../src/ForexSprintVault.sol";

contract UpgradeScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        address proxy = vm.envAddress("PROXY_ADDRESS");
        require(proxy != address(0), "PROXY_ADDRESS not set");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new implementation
        ForexSprintVault newImplementation = new ForexSprintVault();
        
        // Upgrade proxy to new implementation using UUPS
        (bool success, ) = proxy.call(abi.encodeWithSignature("upgradeToAndCall(address,bytes)", address(newImplementation), ""));
        require(success, "Upgrade failed");
        
        console.log("Proxy upgraded!");
        console.log("New Vault Implementation deployed at:", address(newImplementation));

        vm.stopBroadcast();
    }
}
