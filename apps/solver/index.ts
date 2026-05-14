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
const CELO_TOKEN_ADDRESS = "0x471EcE3750Da237f93B8E339c536989b8978a438" as `0x${string}`;
const NATIVE_CELO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

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
  const ACTIVE_USERS: `0x${string}`[] = []; 

  setInterval(async () => {
    try {
      const STABLE_TRADE_SIZE = parseUnits("100", 18);
      const CELO_TRADE_SIZE = parseUnits("10", 18);

      // --- SCAN 1: USDm -> USDC (Uni -> Ube) ---
      // (Keep existing stable scan logic...)

      // --- SCAN 2: CELO -> USDm (Uni -> Ube) ---
      const celoToUsdmUni = await publicClient.readContract({
        address: UNISWAP_V3_QUOTER,
        abi: QUOTER_ABI,
        functionName: "quoteExactInputSingle",
        args: [CELO_TOKEN_ADDRESS, USDM_ADDRESS, 3000, CELO_TRADE_SIZE, 0n]
      });

      const usdmToCeloUbe = await publicClient.readContract({
        address: UBESWAP_ROUTER,
        abi: UBE_ROUTER_ABI,
        functionName: "getAmountsOut",
        args: [celoToUsdmUni, [USDM_ADDRESS, CELO_TOKEN_ADDRESS]]
      });

      const celoProfit = usdmToCeloUbe[1] - CELO_TRADE_SIZE;
      console.log(`[SCAN] CELO -> USDm: In: 10 CELO | Out: ${formatUnits(usdmToCeloUbe[1], 18)} CELO`);

      if (celoProfit > 0n) {
        for (const user of ACTIVE_USERS) {
          const [minProfitBps, isActive] = await publicClient.readContract({
            address: VAULT_PROXY_ADDRESS,
            abi: VAULT_ABI,
            functionName: "botConfigs",
            args: [user, NATIVE_CELO]
          }) as [bigint, boolean];

          if (isActive) {
             // Construct native swap payload
             // Note: In UniV3 Celo, native CELO *is* the ERC20 address 0x471...
             // So we can still use exactInputSingle with CELO_TOKEN_ADDRESS
             
             const swapUni = encodeFunctionData({
                abi: UNI_ROUTER_ABI,
                functionName: "exactInputSingle",
                args: [{
                  tokenIn: CELO_TOKEN_ADDRESS,
                  tokenOut: USDM_ADDRESS,
                  fee: 3000,
                  recipient: EXECUTOR_ADDRESS,
                  deadline: BigInt(Math.floor(Date.now() / 1000) + 60),
                  amountIn: CELO_TRADE_SIZE,
                  amountOutMinimum: 0n,
                  sqrtPriceLimitX96: 0n
                }]
              });

              const swapUbe = encodeFunctionData({
                abi: UBE_ROUTER_ABI,
                functionName: "swapExactTokensForTokens",
                args: [
                  celoToUsdmUni,
                  0n,
                  [USDM_ADDRESS, CELO_TOKEN_ADDRESS],
                  EXECUTOR_ADDRESS,
                  BigInt(Math.floor(Date.now() / 1000) + 60)
                ]
              });

              const executorPayload = encodeFunctionData({
                abi: EXECUTOR_ABI,
                functionName: "execute",
                args: [
                  [UNISWAP_V3_ROUTER, UBESWAP_ROUTER],
                  [swapUni, swapUbe],
                  NATIVE_CELO
                ]
              });

              await walletClient.writeContract({
                address: VAULT_PROXY_ADDRESS,
                abi: VAULT_ABI,
                functionName: "executeArbitrage",
                args: [user, NATIVE_CELO, CELO_TRADE_SIZE, EXECUTOR_ADDRESS, executorPayload]
              });
          }
        }
      }
    } catch (error) {
      console.error(`[ERROR] Poll/Exec failed:`, error);
    }
  }, 10000);
}

main().catch(console.error);
