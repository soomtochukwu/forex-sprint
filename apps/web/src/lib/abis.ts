import { parseAbi } from "viem";

export const VAULT_ABI = parseAbi([
  "function deposit(address token, uint256 amount) external",
  "function withdraw(address token, uint256 amount) external",
  "function configureBot(address token, uint256 minProfitBps, bool isActive, string name, uint8 avatarId) external",
  "function balances(address user, address token) external view returns (uint256)",
  "function botConfigs(address user, address token) external view returns (uint256 minProfitBps, bool isActive)",
  "function botMetadata(address user, address token) external view returns (string name, uint8 avatarId, uint256 totalTrades, uint256 totalProfit)",
  "event ArbitrageExecuted(address indexed user, address indexed token, uint256 profit)"
]);
