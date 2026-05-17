// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/ForexSprintVault.sol";
import "../src/ArbitrageExecutor.sol";

contract ForexSprintVaultTest is Test {
    ForexSprintVault vault;
    ArbitrageExecutor executor;

    address constant USDT = 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e;

    address user = address(0x1);
    address solver = address(0x2);

    function setUp() public {
        vm.createSelectFork("https://forno.celo.org");

        // Deploy implementation
        ForexSprintVault implementation = new ForexSprintVault();
        
        // Deploy proxy and initialize
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            abi.encodeCall(ForexSprintVault.initialize, (address(this)))
        );

        vault = ForexSprintVault(payable(address(proxy)));
        executor = new ArbitrageExecutor(address(vault));
        
        vault.setSolver(solver, true);

        // Fund user with USDT
        deal(USDT, user, 1000 * 10**6);

        vm.startPrank(user);
        IERC20(USDT).approve(address(vault), type(uint256).max);
        vault.deposit(USDT, 100 * 10**6);
        vault.configureBot(USDT, 1, true, "Sonic", 1); // 0.01% min profit, name, avatar
        vm.stopPrank();
    }

    function testMockArbitrage() public {
        address[] memory targets = new address[](1);
        bytes[] memory data = new bytes[](1);
        
        targets[0] = address(this);
        data[0] = abi.encodeWithSignature("mockTrade(address,uint256)", USDT, 10 * 10**6);

        bytes memory executorData = abi.encodeWithSelector(
            ArbitrageExecutor.execute.selector,
            targets,
            data,
            USDT
        );

        uint256 userBalanceBefore = vault.balances(user, USDT);

        vm.startPrank(solver);
        vault.executeArbitrage(user, USDT, 10 * 10**6, address(executor), executorData);
        vm.stopPrank();

        uint256 userBalanceAfter = vault.balances(user, USDT);
        assertGt(userBalanceAfter, userBalanceBefore, "User should make profit");
    }

    function testNativeCelo() public {
        uint256 amount = 10 ether;
        deal(user, amount);

        vm.startPrank(user);
        vault.depositCELO{value: amount}();
        assertEq(vault.balances(user, address(0)), amount, "Balance should match");

        vault.withdraw(address(0), 5 ether);
        assertEq(vault.balances(user, address(0)), 5 ether, "Balance should be 5");
        assertEq(user.balance, 5 ether, "User should have 5 native CELO");
        vm.stopPrank();
    }

    // Helper for mock trade
    function mockTrade(address token, uint256 /*amount*/) external {
        // Send extra profit to msg.sender (executor)
        deal(token, msg.sender, IERC20(token).balanceOf(msg.sender) + 1 * 10**6);
    }
}
