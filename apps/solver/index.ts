import { createPublicClient, createWalletClient, http, parseAbi, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import dotenv from "dotenv";

dotenv.config();

// Contract Addresses
const VAULT_PROXY_ADDRESS = process.env.VAULT_ADDRESS as `0x${string}`;
const EXECUTOR_ADDRESS = process.env.EXECUTOR_ADDRESS as `0x${string}`;

const USDM_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`;
const USDC_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`;

const UNISWAP_V3_QUOTER = "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8" as `0x${string}`; // Celo Mainnet
const UBESWAP_ROUTER = "0xE3D8bd6Aed4F159bc8000a9cD47CffDb95F96121" as `0x${string}`; // Celo Mainnet

// ABIs
const QUOTER_ABI = parseAbi([
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)"
]);

const UBE_ROUTER_ABI = parseAbi([
  "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)"
]);

const VAULT_ABI = parseAbi([
  "function executeArbitrage(address user, address token, uint256 amountToUse, address executor, bytes calldata executorData) external"
]);

const EXECUTOR_ABI = parseAbi([
  "function execute(address[] calldata targets, bytes[] calldata data, address returnToken) external"
]);

async function main() {
  console.log("> FOREX_SPRINT_ SOLVER_NODE");
  console.log("> INITIALIZING...");

  const account = privateKeyToAccount((process.env.SOLVER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001") as `0x${string}`);
  
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
  console.log("> COMMENCING MEMPOOL/DEX POLLING...");

  const TRADE_SIZE = parseUnits("100", 18); // Check arbitrage for 100 USDm

  setInterval(async () => {
    try {
      // 1. Check Uniswap V3 (USDm -> USDC)
      const uniOut = await publicClient.readContract({
        address: UNISWAP_V3_QUOTER,
        abi: QUOTER_ABI,
        functionName: "quoteExactInputSingle",
        args: [USDM_ADDRESS, USDC_ADDRESS, 500, TRADE_SIZE, 0n] // 0.05% pool
      });

      // 2. Check Ubeswap (USDC -> USDm)
      const ubeOut = await publicClient.readContract({
        address: UBESWAP_ROUTER,
        abi: UBE_ROUTER_ABI,
        functionName: "getAmountsOut",
        args: [uniOut, [USDC_ADDRESS, USDM_ADDRESS]]
      });

      const finalAmount = ubeOut[1];
      const profit = finalAmount - TRADE_SIZE;

      console.log(`[SCAN] Uniswap (USDm->USDC) -> Ubeswap (USDC->USDm):`);
      console.log(`   In: 100.00 USDm`);
      console.log(`   Out: ${formatUnits(finalAmount, 18)} USDm`);

      if (profit > 0n) {
        console.log(`[ARBITRAGE_FOUND] Expected Profit: +${formatUnits(profit, 18)} USDm`);
        
        // Mock payload creation for the Executor
        // In a real scenario, this would encode the approve/swap calls for Uniswap and Ubeswap
        console.log(`[EXEC] Dispatching payload to Vault...`);

        // const hash = await walletClient.writeContract({
        //   address: VAULT_PROXY_ADDRESS,
        //   abi: VAULT_ABI,
        //   functionName: "executeArbitrage",
        //   args: [
        //     "0xUSER_ADDRESS", 
        //     USDM_ADDRESS, 
        //     TRADE_SIZE, 
        //     EXECUTOR_ADDRESS, 
        //     "0xENCODED_EXECUTOR_PAYLOAD"
        //   ]
        // });
        // console.log(`[SUCCESS] Tx Hash: ${hash}`);
      } else {
        console.log(`[NO_ARB] Spread negative or zero.`);
      }

    } catch (error) {
      console.log(`[ERROR] Network poll failed. (Are contract addresses correct?)`);
    }
    
    console.log("-----------------------------------------");
  }, 10000); // poll every 10s
}

main().catch(console.error);
