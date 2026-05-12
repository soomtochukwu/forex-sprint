// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ArbitrageExecutor {
    address public immutable vault;

    constructor(address _vault) {
        vault = _vault;
    }

    // Solver sends arbitrary calls (e.g. approve Router1, swap, approve Router2, swap)
    function execute(
        address[] calldata targets,
        bytes[] calldata data,
        address returnToken
    ) external {
        require(msg.sender == vault, "Only vault");

        for (uint i = 0; i < targets.length; i++) {
            (bool success, ) = targets[i].call(data[i]);
            require(success, "Call failed");
        }

        uint256 balance = IERC20(returnToken).balanceOf(address(this));
        if (balance > 0) {
            require(IERC20(returnToken).transfer(vault, balance), "Return transfer failed");
        }
    }

    // In case other tokens are left over
    function recoverToken(address token) external {
        require(msg.sender == vault, "Only vault");
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(vault, balance);
        }
    }
}
