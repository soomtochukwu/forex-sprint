// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {ForexSprintVault} from "../src/ForexSprintVault.sol";

contract UpgradeScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Ensure proxy address is passed via env or read from frontend state
        address proxy = vm.envAddress("PROXY_ADDRESS");
        require(proxy != address(0), "PROXY_ADDRESS not set");

        vm.startBroadcast(deployerPrivateKey);

        // Upgrade proxy to new implementation
        Upgrades.upgradeProxy(proxy, "ForexSprintVault.sol", "");
        
        address newImplementation = Upgrades.getImplementationAddress(proxy);
        
        console.log("Proxy upgraded!");
        console.log("New Vault Implementation deployed at:", newImplementation);

        vm.stopBroadcast();

        syncFrontend(proxy, newImplementation);
    }

    function syncFrontend(address proxy, address newImplementation) internal {
        string memory root = vm.projectRoot();
        
        string memory abiVault = vm.readFile(string.concat(root, "/out/ForexSprintVault.sol/ForexSprintVault.json"));
        
        string memory jsonPath = string.concat(root, "/../web/contracts_upgraded.json");

        string memory output = "{\n";
        output = string.concat(output, "  \"ForexSprintVault\": {\n");
        output = string.concat(output, "    \"proxy\": \"", vm.toString(proxy), "\",\n");
        output = string.concat(output, "    \"implementation\": \"", vm.toString(newImplementation), "\",\n");
        output = string.concat(output, "    \"artifact\": \"ForexSprintVault.json\"\n");
        output = string.concat(output, "  }\n");
        output = string.concat(output, "}");

        vm.writeFile(jsonPath, output);
        
        string memory webAbiDir = string.concat(root, "/../web/abis/");
        vm.createDir(webAbiDir, true);
        vm.writeFile(string.concat(webAbiDir, "ForexSprintVault.json"), abiVault);
        
        console.log("Sync complete: frontend now has updated implementation address and ABI.");
    }
}
