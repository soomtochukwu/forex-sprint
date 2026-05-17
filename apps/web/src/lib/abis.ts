import { parseAbi } from "viem";

export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
]);

export const VAULT_ABI = parseAbi([
  "function deposit(address token, uint256 amount) external",
  "function depositCELO() external payable",
  "function depositAndConfigure(address token, uint256 amount, uint256 minProfitBps, bool isActive, string name, uint8 avatarId) external",
  "function depositCELOAndConfigure(uint256 minProfitBps, bool isActive, string name, uint8 avatarId) external payable",
  "function withdraw(address token, uint256 amount) external",
  "function configureBot(address token, uint256 minProfitBps, bool isActive, string name, uint8 avatarId) external",
  "function balances(address user, address token) external view returns (uint256)",
  "function botConfigs(address user, address token) external view returns (uint256 minProfitBps, bool isActive)",
  "function botMetadata(address user, address token) external view returns (string name, uint8 avatarId, uint256 totalTrades, uint256 totalProfit)",
  "function owner() external view returns (address)",
  "function protocolFees(address token) external view returns (uint256)",
  "function withdrawProtocolFees(address token) external",
  "function isSolver(address solver) external view returns (bool)",
  "function setSolver(address solver, bool _isSolver) external",
  "event ArbitrageExecuted(address indexed user, address indexed token, uint256 profit)"
]);
