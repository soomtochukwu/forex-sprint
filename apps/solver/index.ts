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
  
  console.log("> COMMENCING SCAN LOOP...");

  const runScan = async () => {
    console.log("[TICK] Starting DEX scan...");
    try {
      // Get all configured bots from the blockchain
      const activeUsersSet = new Set<`0x${string}`>();
      try {
        const logs = await publicClient.getLogs({
          address: VAULT_PROXY_ADDRESS,
          event: parseAbi([
            "event BotConfigured(address indexed user, address indexed token, uint256 minProfitBps, bool isActive, string name, uint8 avatarId)"
          ])[0],
          fromBlock: "earliest",
        });
        logs.forEach(l => activeUsersSet.add((l as any).args.user));
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      }
      const ACTIVE_USERS = Array.from(activeUsersSet);

      const STABLE_TRADE_SIZE = parseUnits("100", 6); // USDT has 6 decimals
      const CELO_TRADE_SIZE = parseUnits("10", 18);

      // --- SCAN 1: USDT -> USDC (Uni -> Ube) ---
      console.log("   -> Scanning USDT/USDC...");
      let usdmToUsdcUni = 0n;
      let selectedStableFee = 0;
      for (const fee of [100, 500, 3000]) {
        try {
          usdmToUsdcUni = await publicClient.readContract({
            address: UNISWAP_V3_QUOTER,
            abi: QUOTER_ABI,
            functionName: "quoteExactInputSingle",
            args: [USDT_ADDRESS, USDC_ADDRESS, fee, STABLE_TRADE_SIZE, 0n]
          }) as bigint;
          if (usdmToUsdcUni > 0n) {
            selectedStableFee = fee;
            break;
          }
        } catch (e) {}
      }

      if (usdmToUsdcUni > 0n) {
        const usdcToUsdmUbe = await publicClient.readContract({
          address: UBESWAP_ROUTER,
          abi: UBE_ROUTER_ABI,
          functionName: "getAmountsOut",
          args: [usdmToUsdcUni, [USDC_ADDRESS, USDT_ADDRESS]]
        }) as bigint[];
        
        const stableProfit = usdcToUsdmUbe[1] - STABLE_TRADE_SIZE;
        console.log(`[SCAN] USDT -> USDC: Profit: ${formatUnits(stableProfit, 6)} USDT (Fee: ${selectedStableFee})`);
        
        if (stableProfit > 0n) {
          for (const user of ACTIVE_USERS) {
            const [minProfitBps, isActive] = await publicClient.readContract({
              address: VAULT_PROXY_ADDRESS,
              abi: VAULT_ABI,
              functionName: "botConfigs",
              args: [user, USDT_ADDRESS]
            }) as [bigint, boolean];

            if (isActive) {
               const minProfit = (STABLE_TRADE_SIZE * minProfitBps) / 10000n;
               if (stableProfit >= minProfit) {
                 console.log(`[EXEC] Attempting USDT stable arbitrage for user ${user}...`);
                 const swapUni = encodeFunctionData({
                    abi: UNI_ROUTER_ABI,
                    functionName: "exactInputSingle",
                    args: [{
                      tokenIn: USDT_ADDRESS,
                      tokenOut: USDC_ADDRESS,
                      fee: selectedStableFee,
                      recipient: EXECUTOR_ADDRESS,
                      deadline: BigInt(Math.floor(Date.now() / 1000) + 60),
                      amountIn: STABLE_TRADE_SIZE,
                      amountOutMinimum: usdmToUsdcUni, // MEV Protection
                      sqrtPriceLimitX96: 0n
                    }]
                  });

                  const swapUbe = encodeFunctionData({
                    abi: UBE_ROUTER_ABI,
                    functionName: "swapExactTokensForTokens",
                    args: [
                      usdmToUsdcUni,
                      STABLE_TRADE_SIZE + minProfit, // MEV Protection (Total expected out)
                      [USDC_ADDRESS, USDT_ADDRESS],
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
                      USDT_ADDRESS
                    ]
                  });

                  const hash = await walletClient.writeContract({
                    address: VAULT_PROXY_ADDRESS,
                    abi: VAULT_ABI,
                    functionName: "executeArbitrage",
                    args: [user, USDT_ADDRESS, STABLE_TRADE_SIZE, EXECUTOR_ADDRESS, executorPayload]
                  });
                  console.log(`[SUCCESS] Tx Hash: ${hash}`);
               }
            }
          }
        }
      }

      // --- SCAN 2: CELO -> USDT (Uni -> Ube) ---
      console.log("   -> Scanning CELO/USDT...");
      let celoToUsdmUni = 0n;
      let selectedCeloFee = 0;
      for (const fee of [500, 3000, 10000]) {
        try {
          celoToUsdmUni = await publicClient.readContract({
            address: UNISWAP_V3_QUOTER,
            abi: QUOTER_ABI,
            functionName: "quoteExactInputSingle",
            args: [CELO_TOKEN_ADDRESS, USDT_ADDRESS, fee, CELO_TRADE_SIZE, 0n]
          }) as bigint;
          if (celoToUsdmUni > 0n) {
            selectedCeloFee = fee;
            break;
          }
        } catch (e) {}
      }

      if (celoToUsdmUni > 0n) {
        const usdmToCeloUbeArr = await publicClient.readContract({
          address: UBESWAP_ROUTER,
          abi: UBE_ROUTER_ABI,
          functionName: "getAmountsOut",
          args: [celoToUsdmUni, [USDT_ADDRESS, CELO_TOKEN_ADDRESS]]
        }) as bigint[];

        const celoProfit = usdmToCeloUbeArr[1] - CELO_TRADE_SIZE;
        console.log(`[SCAN] CELO -> USDT: Profit: ${formatUnits(celoProfit, 18)} CELO (Fee: ${selectedCeloFee})`);

        if (celoProfit > 0n) {
          for (const user of ACTIVE_USERS) {
            const [minProfitBps, isActive] = await publicClient.readContract({
              address: VAULT_PROXY_ADDRESS,
              abi: VAULT_ABI,
              functionName: "botConfigs",
              args: [user, NATIVE_CELO]
            }) as [bigint, boolean];

            if (isActive) {
               const minProfit = (CELO_TRADE_SIZE * minProfitBps) / 10000n;
               if (celoProfit >= minProfit) {
                 console.log(`[EXEC] Attempting CELO arbitrage for user ${user}...`);
                 const swapUni = encodeFunctionData({
                    abi: UNI_ROUTER_ABI,
                    functionName: "exactInputSingle",
                    args: [{
                      tokenIn: CELO_TOKEN_ADDRESS,
                      tokenOut: USDT_ADDRESS,
                      fee: selectedCeloFee,
                      recipient: EXECUTOR_ADDRESS,
                      deadline: BigInt(Math.floor(Date.now() / 1000) + 60),
                      amountIn: CELO_TRADE_SIZE,
                      amountOutMinimum: celoToUsdmUni, // MEV Protection
                      sqrtPriceLimitX96: 0n
                    }]
                  });

                  const swapUbe = encodeFunctionData({
                    abi: UBE_ROUTER_ABI,
                    functionName: "swapExactTokensForTokens",
                    args: [
                      celoToUsdmUni,
                      CELO_TRADE_SIZE + minProfit, // MEV Protection
                      [USDT_ADDRESS, CELO_TOKEN_ADDRESS],
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

                  const hash = await walletClient.writeContract({
                    address: VAULT_PROXY_ADDRESS,
                    abi: VAULT_ABI,
                    functionName: "executeArbitrage",
                    args: [user, NATIVE_CELO, CELO_TRADE_SIZE, EXECUTOR_ADDRESS, executorPayload]
                  });
                  console.log(`[SUCCESS] Tx Hash: ${hash}`);
               }
            }
          }
        }
      }
    } catch (error) {
      console.error(`[ERROR] Scan failed:`, error);
    }
    console.log("[TICK] Scan finished. Waiting 10s...");
    setTimeout(runScan, 10000);
  };

  runScan();
}


main().catch(console.error);
