import { createPublicClient, createWalletClient, http, parseAbi, parseUnits, formatUnits, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import dotenv from "dotenv";

dotenv.config();

// Contract Addresses
const VAULT_PROXY_ADDRESS = (process.env.VAULT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const EXECUTOR_ADDRESS = (process.env.EXECUTOR_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

const USDM_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`;
const USDC_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`;

const UNISWAP_V3_QUOTER = "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8" as `0x${string}`;
const UNISWAP_V3_ROUTER = "0x5615CDAb103725356Aa99F57aE647773503e5C96" as `0x${string}`;
const UBESWAP_ROUTER = "0xE3D8bd6Aed4F159bc8000a9cD47CffDb95F96121" as `0x${string}`;

// ABIs
const QUOTER_ABI = parseAbi([
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)"
]);

const UNI_ROUTER_ABI = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
]);

const UBE_ROUTER_ABI = parseAbi([
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)"
]);

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
]);

const VAULT_ABI = parseAbi([
  "function executeArbitrage(address user, address token, uint256 amountToUse, address executor, bytes calldata executorData) external",
  "function botConfigs(address user, address token) external view returns (uint256 minProfitBps, bool isActive)",
  "function balances(address user, address token) external view returns (uint256)"
]);

const EXECUTOR_ABI = parseAbi([
  "function execute(address[] calldata targets, bytes[] calldata data, address returnToken) external"
]);

async function main() {
  console.log("> FOREX_SPRINT_ SOLVER_NODE");
  console.log("> INITIALIZING...");

  const privateKey = (process.env.SOLVER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001") as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  
  const publicClient = createPublicClient({
    chain: celo,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: http()
  });

  console.log(`> CONNECTED AS: ${account.address}`);
  
  // For MVP, we'll monitor a specific set of users or a registry
  // In a real app, you'd scan events to find all active bots
  const ACTIVE_USERS: `0x${string}`[] = []; // Add test user addresses here

  setInterval(async () => {
    try {
      const TRADE_SIZE = parseUnits("100", 18);

      // 1. SCAN OPPORTUNITY: Uniswap -> Ubeswap
      const uniOut = await publicClient.readContract({
        address: UNISWAP_V3_QUOTER,
        abi: QUOTER_ABI,
        functionName: "quoteExactInputSingle",
        args: [USDM_ADDRESS, USDC_ADDRESS, 500, TRADE_SIZE, 0n]
      });

      const ubeOut = await publicClient.readContract({
        address: UBESWAP_ROUTER,
        abi: UBE_ROUTER_ABI,
        functionName: "getAmountsOut",
        args: [uniOut, [USDC_ADDRESS, USDM_ADDRESS]]
      });

      const finalAmount = ubeOut[1];
      const profit = finalAmount - TRADE_SIZE;

      console.log(`[SCAN] UniV3 -> Ube: In: 100 USDm | Out: ${formatUnits(finalAmount, 18)} USDm`);

      if (profit > 0n) {
        console.log(`[ARBITRAGE_FOUND] Profit: +${formatUnits(profit, 18)} USDm`);
        
        // Find a user bot that can take this
        for (const user of ACTIVE_USERS) {
          const [minProfitBps, isActive] = await publicClient.readContract({
            address: VAULT_PROXY_ADDRESS,
            abi: VAULT_ABI,
            functionName: "botConfigs",
            args: [user, USDM_ADDRESS]
          }) as [bigint, boolean];

          const userBalance = await publicClient.readContract({
            address: VAULT_PROXY_ADDRESS,
            abi: VAULT_ABI,
            functionName: "balances",
            args: [user, USDM_ADDRESS]
          }) as bigint;

          if (isActive && userBalance >= TRADE_SIZE) {
            const minProfit = (TRADE_SIZE * minProfitBps) / 10000n;
            if (profit >= minProfit) {
              console.log(`[EXEC] Dispatching for user ${user}...`);

              // Construct executor payload
              // 1. Approve Uni Router
              const approveUni = encodeFunctionData({
                abi: ERC20_ABI,
                functionName: "approve",
                args: [UNISWAP_V3_ROUTER, TRADE_SIZE]
              });
              
              // 2. Swap on Uni
              const swapUni = encodeFunctionData({
                abi: UNI_ROUTER_ABI,
                functionName: "exactInputSingle",
                args: [{
                  tokenIn: USDM_ADDRESS,
                  tokenOut: USDC_ADDRESS,
                  fee: 500,
                  recipient: EXECUTOR_ADDRESS,
                  deadline: BigInt(Math.floor(Date.now() / 1000) + 60),
                  amountIn: TRADE_SIZE,
                  amountOutMinimum: 0n,
                  sqrtPriceLimitX96: 0n
                }]
              });

              // 3. Approve Ube Router
              const approveUbe = encodeFunctionData({
                abi: ERC20_ABI,
                functionName: "approve",
                args: [UBESWAP_ROUTER, uniOut]
              });

              // 4. Swap on Ube
              const swapUbe = encodeFunctionData({
                abi: UBE_ROUTER_ABI,
                functionName: "swapExactTokensForTokens",
                args: [
                  uniOut,
                  0n,
                  [USDC_ADDRESS, USDM_ADDRESS],
                  EXECUTOR_ADDRESS,
                  BigInt(Math.floor(Date.now() / 1000) + 60)
                ]
              });

              const executorPayload = encodeFunctionData({
                abi: EXECUTOR_ABI,
                functionName: "execute",
                args: [
                  [USDM_ADDRESS, UNISWAP_V3_ROUTER, USDC_ADDRESS, UBESWAP_ROUTER],
                  [approveUni, swapUni, approveUbe, swapUbe],
                  USDM_ADDRESS
                ]
              });

              const hash = await walletClient.writeContract({
                address: VAULT_PROXY_ADDRESS,
                abi: VAULT_ABI,
                functionName: "executeArbitrage",
                args: [user, USDM_ADDRESS, TRADE_SIZE, EXECUTOR_ADDRESS, executorPayload]
              });

              console.log(`[SUCCESS] Tx Hash: ${hash}`);
              break; // Execute one for now
            }
          }
        }
      }
    } catch (error) {
      console.error(`[ERROR] Poll/Exec failed:`, error);
    }
  }, 10000);
}

main().catch(console.error);
