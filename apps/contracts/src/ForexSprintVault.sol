// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract ForexSprintVault is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    struct BotConfig {
        uint256 minProfitBps; // 100 = 1%
        bool isActive;
    }

    // user => token => balance
    mapping(address => mapping(address => uint256)) public balances;
    
    // user => token => config
    mapping(address => mapping(address => BotConfig)) public botConfigs;

    uint256 public protocolFeeBps;

    // token => protocol accumulated fees
    mapping(address => uint256) public protocolFees;

    // solver whitelist
    mapping(address => bool) public isSolver;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event BotConfigured(address indexed user, address indexed token, uint256 minProfitBps, bool isActive);
    event ArbitrageExecuted(address indexed user, address indexed token, uint256 profit);

    modifier onlySolver() {
        require(isSolver[msg.sender], "Not solver");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) initializer public {
        __Ownable_init(initialOwner);
        
        protocolFeeBps = 1000; // 10%
        isSolver[initialOwner] = true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setSolver(address solver, bool _isSolver) external onlyOwner {
        isSolver[solver] = _isSolver;
    }

    function deposit(address token, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        balances[msg.sender][token] += amount;
        emit Deposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external {
        require(balances[msg.sender][token] >= amount, "Insufficient balance");
        balances[msg.sender][token] -= amount;
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawn(msg.sender, token, amount);
    }

    function configureBot(address token, uint256 minProfitBps, bool isActive) external {
        require(minProfitBps <= 10000, "Invalid bps");
        botConfigs[msg.sender][token] = BotConfig({
            minProfitBps: minProfitBps,
            isActive: isActive
        });
        emit BotConfigured(msg.sender, token, minProfitBps, isActive);
    }

    function executeArbitrage(
        address user,
        address token,
        uint256 amountToUse,
        address executor,
        bytes calldata executorData
    ) external onlySolver {
        BotConfig memory config = botConfigs[user][token];
        require(config.isActive, "Bot not active");
        require(balances[user][token] >= amountToUse, "Insufficient user balance");

        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        
        // Transfer funds to executor
        require(IERC20(token).transfer(executor, amountToUse), "Transfer to executor failed");

        // Call executor
        (bool success, ) = executor.call(executorData);
        require(success, "Executor call failed");

        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        
        // Calculate expected minimum balance
        uint256 minProfit = (amountToUse * config.minProfitBps) / 10000;
        require(balanceAfter >= balanceBefore + minProfit, "Insufficient profit");

        uint256 totalProfit = balanceAfter - balanceBefore;
        uint256 fee = (totalProfit * protocolFeeBps) / 10000;
        uint256 userProfit = totalProfit - fee;

        balances[user][token] += userProfit;
        protocolFees[token] += fee;

        emit ArbitrageExecuted(user, token, totalProfit);
    }

    function withdrawProtocolFees(address token) external onlyOwner {
        uint256 amount = protocolFees[token];
        require(amount > 0, "No fees");
        protocolFees[token] = 0;
        require(IERC20(token).transfer(owner(), amount), "Transfer failed");
    }
}
