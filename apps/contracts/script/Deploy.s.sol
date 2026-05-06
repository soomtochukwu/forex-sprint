// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {ForexSprintVault} from "../src/ForexSprintVault.sol";
import {ArbitrageExecutor} from "../src/ArbitrageExecutor.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying from address:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy UUPS Proxy for Vault
        address proxy = Upgrades.deployUUPSProxy(
            "ForexSprintVault.sol",
            abi.encodeCall(ForexSprintVault.initialize, (deployer))
        );

        address implementation = Upgrades.getImplementationAddress(proxy);

        console.log("Vault Proxy deployed at:", proxy);
        console.log("Vault Implementation deployed at:", implementation);

        // Deploy ArbitrageExecutor
        ArbitrageExecutor executor = new ArbitrageExecutor(proxy);
        console.log("ArbitrageExecutor deployed at:", address(executor));

        vm.stopBroadcast();

        // Write contract deployment info and ABI to the frontend
        syncFrontend(proxy, implementation, address(executor));
    }

    function syncFrontend(address proxy, address implementation, address executor) internal {
        string memory root = vm.projectRoot();
        
        string memory abiVault = vm.readFile(string.concat(root, "/out/ForexSprintVault.sol/ForexSprintVault.json"));
        string memory abiExecutor = vm.readFile(string.concat(root, "/out/ArbitrageExecutor.sol/ArbitrageExecutor.json"));
        
        // We will generate a structured JSON manually using forge-std/vm
        string memory jsonPath = string.concat(root, "/../web/contracts.json");

        string memory output = "{\n";
        output = string.concat(output, "  \"ForexSprintVault\": {\n");
        output = string.concat(output, "    \"proxy\": \"", vm.toString(proxy), "\",\n");
        output = string.concat(output, "    \"implementation\": \"", vm.toString(implementation), "\",\n");
        // For ABI, we could parse it, but for simplicity we write the raw addresses here. 
        // We will copy the full ABI in a separate step or let the frontend import the out/ folder.
        output = string.concat(output, "    \"artifact\": \"ForexSprintVault.json\"\n");
        output = string.concat(output, "  },\n");
        output = string.concat(output, "  \"ArbitrageExecutor\": {\n");
        output = string.concat(output, "    \"address\": \"", vm.toString(executor), "\",\n");
        output = string.concat(output, "    \"artifact\": \"ArbitrageExecutor.json\"\n");
        output = string.concat(output, "  }\n");
        output = string.concat(output, "}");

        vm.writeFile(jsonPath, output);
        
        // Also copy the artifacts to the frontend directory
        string memory webAbiDir = string.concat(root, "/../web/abis/");
        vm.createDir(webAbiDir, true);
        vm.writeFile(string.concat(webAbiDir, "ForexSprintVault.json"), abiVault);
        vm.writeFile(string.concat(webAbiDir, "ArbitrageExecutor.json"), abiExecutor);
        
        console.log("Sync complete: frontend now has latest proxy addresses and ABIs at apps/web/contracts.json");
    }
}
