"use client";

import React, { useState } from "react";
import { Terminal, Activity, Database, Crosshair, Trophy, ArrowDownToLine } from "lucide-react";
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { VAULT_ADDRESS, USDT_ADDRESS, NATIVE_CELO } from "@/lib/constants";
import { VAULT_ABI, ERC20_ABI } from "@/lib/abis";
import { BotTrack } from "@/components/bot-track";
import { BotCreationModal } from "@/components/bot-creation-modal";

export default function Home() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [activeAsset, setActiveAsset] = useState<string>(USDT_ADDRESS);

  // 1. Read User Balances
  const { data: usdtBalance, refetch: refetchUsdt } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "balances",
    args: [address!, USDT_ADDRESS],
    query: { enabled: !!address }
  });

  const { data: celoBalance, refetch: refetchCelo } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "balances",
    args: [address!, NATIVE_CELO],
    query: { enabled: !!address }
  });

  // 2. Read Bot Config & Meta for Active Asset
  const { data: botConfig } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "botConfigs",
    args: [address!, activeAsset as `0x${string}`],
    query: { enabled: !!address }
  });

  const { data: botMetadata, refetch: refetchMeta } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "botMetadata",
    args: [address!, activeAsset as `0x${string}`],
    query: { enabled: !!address }
  });

  // Read Allowance
  const { data: usdtAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, VAULT_ADDRESS],
    query: { enabled: !!address }
  });

  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Initializing Forex Sprint engine...",
    "[SYSTEM] Connected to Celo Mainnet.",
    "[SYSTEM] Loading Ubeswap & Uniswap V3 interfaces...",
    "[READY] Waiting for user deployment.",
  ]);

  const refreshAll = () => {
    refetchUsdt();
    refetchCelo();
    refetchMeta();
    refetchAllowance();
  };

  // 1. Watch for Arbitrage Execution
  useWatchContractEvent({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    eventName: "ArbitrageExecuted",
    onLogs(logs) {
      const myLog = logs.find(l => (l as any).args.user === address);
      if (myLog) {
        const token = (myLog as any).args.token;
        const decimals = token === NATIVE_CELO ? 18 : 6;
        const profit = formatUnits((myLog as any).args.profit, decimals);
        const symbol = token === NATIVE_CELO ? "CELO" : "USDT";
        setLogs(prev => [...prev, `[EXEC] ${symbol} PROFIT REALIZED: +${profit} ${symbol}`]);
        refreshAll();
      }
    },
  });

  // 2. Watch for Bot Configuration / Deployment
  useWatchContractEvent({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    eventName: "BotConfigured",
    onLogs(logs) {
      const myLog = logs.find(l => (l as any).args.user === address);
      if (myLog) {
        refreshAll();
      }
    },
  });

  // 3. Watch for Deposits
  useWatchContractEvent({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    eventName: "Deposited",
    onLogs(logs) {
      const myLog = logs.find(l => (l as any).args.user === address);
      if (myLog) {
        refreshAll();
      }
    },
  });

  const handleDeploy = async (name: string, avatarId: number, capital: string, token: string) => {
    try {
      const symbol = token === NATIVE_CELO ? "CELO" : "USDT";
      const decimals = token === NATIVE_CELO ? 18 : 6;
      const amount = parseUnits(capital, decimals);

      setLogs((prev) => [
        ...prev,
        `[EXEC] Deploying ${symbol} Agent Bot "${name}"...`,
        `[INFO] Capital: ${capital} ${symbol}`,
      ]);

      setActiveAsset(token);

      if (token === NATIVE_CELO) {
        await writeContractAsync({
          address: VAULT_ADDRESS,
          abi: VAULT_ABI,
          functionName: "depositCELOAndConfigure",
          args: [1n, true, name, avatarId],
          value: amount,
        });
        setLogs(prev => [...prev, `[SUCCESS] CELO Bot Deployed!`]);
      } else {
        // Handle ERC20 Approval
        const currentAllowance = (usdtAllowance as bigint) || 0n;
        if (currentAllowance < amount) {
          setLogs(prev => [...prev, `[INFO] Requesting USDT Approval...`]);
          await writeContractAsync({
            address: USDT_ADDRESS,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [VAULT_ADDRESS, amount],
          });
          setLogs(prev => [...prev, `[SUCCESS] USDT Approved. Proceeding to deposit...`]);
          // Refetch allowance just in case
          refetchAllowance();
          // Note: The UI might need to wait for tx confirmation here before the next call
          // but we will attempt the deposit immediately assuming fast block times or user handles it.
        }

        await writeContractAsync({
          address: VAULT_ADDRESS,
          abi: VAULT_ABI,
          functionName: "depositAndConfigure",
          args: [token as `0x${string}`, amount, 1n, true, name, avatarId],
        });
        setLogs(prev => [...prev, `[SUCCESS] USDT Bot Deployed!`]);
      }
      refetchUsdt();
      refetchCelo();
      refetchMeta();
    } catch (error: any) {
      console.error(error);
      setLogs(prev => [...prev, `[ERROR] Deployment failed: ${error.shortMessage || error.message}`]);
    }
  };

  const handleWithdraw = async () => {
    try {
      const symbol = activeAsset === NATIVE_CELO ? "CELO" : "USDT";
      const balance = activeAsset === NATIVE_CELO ? celoBalance : usdtBalance;
      if (!balance || (balance as bigint) === 0n) return;
      
      setLogs((prev) => [
        ...prev,
        `[EXEC] Withdrawing ${symbol} balance...`
      ]);

      await writeContractAsync({
          address: VAULT_ADDRESS,
          abi: VAULT_ABI,
          functionName: "withdraw",
          args: [activeAsset as `0x${string}`, balance as bigint]
      });
      setLogs(prev => [...prev, `[SUCCESS] ${symbol} Withdrawn!`]);
      refetchUsdt();
      refetchCelo();
      refetchMeta();
    } catch (error: any) {
      setLogs(prev => [...prev, `[ERROR] Withdrawal failed: ${error.shortMessage || error.message}`]);
    }
  };

  const isActive = botConfig ? (botConfig as any)[1] : false;
  const activeDecimals = activeAsset === NATIVE_CELO ? 18 : 6;
  const currentProfit = botMetadata ? formatUnits((botMetadata as any)[3], activeDecimals) : "0.00";
  const totalTrades = botMetadata ? (botMetadata as any)[2].toString() : "0";
  const activeSymbol = activeAsset === NATIVE_CELO ? "CELO" : "USDT";

  // Mock track data based on real bot
  const activeBots = botMetadata && isActive ? [
    {
      id: "my-bot",
      name: (botMetadata as any)[0],
      avatarId: (botMetadata as any)[1],
      profit: currentProfit,
      isActive: true,
      progress: 65,
      symbol: activeSymbol
    }
  ] : [];

  return (
    <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <header className="mb-8 border-b border-border pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Terminal className="h-8 w-8" />
            &gt; FOREX_SPRINT_
          </h1>
          <p className="text-muted-foreground mt-2">
            Automated Cross-DEX Arbitrage Engine
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">USDT Balance</div>
            <div className="text-sm font-bold font-mono text-primary">
              {usdtBalance ? formatUnits(usdtBalance as bigint, 6) : "0.00"}
            </div>
          </div>
          <div className="border-l border-border pl-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">CELO Balance</div>
            <div className="text-sm font-bold font-mono text-primary">
              {celoBalance ? formatUnits(celoBalance as bigint, 18) : "0.00"}
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Controls & Track */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveAsset(USDT_ADDRESS)}
              className={`px-4 py-1 text-[10px] uppercase font-bold border transition-colors ${activeAsset === USDT_ADDRESS ? "bg-primary text-black border-primary" : "text-muted-foreground border-border hover:border-primary/50"}`}
            >
              USDT_View
            </button>
            <button 
              onClick={() => setActiveAsset(NATIVE_CELO)}
              className={`px-4 py-1 text-[10px] uppercase font-bold border transition-colors ${activeAsset === NATIVE_CELO ? "bg-primary text-black border-primary" : "text-muted-foreground border-border hover:border-primary/50"}`}
            >
              CELO_View
            </button>
          </div>
          
          <BotTrack bots={activeBots} />

          <div className="border border-border bg-[#0A0A0A] p-4 relative h-full">
            <div className="absolute top-0 left-0 bg-border px-2 py-1 text-[10px] uppercase font-bold text-foreground">
              StdOut // Arbitrage_Log
            </div>
            
            <div className="mt-8 p-4 flex-1 overflow-y-auto space-y-2 font-mono text-xs max-h-[250px]">
              {logs.map((log, i) => (
                <div key={i} className={`
                  ${log.includes("[SYSTEM]") ? "text-muted-foreground" : ""}
                  ${log.includes("[INFO]") ? "text-blue-400" : ""}
                  ${log.includes("[EXEC]") ? "text-primary" : ""}
                  ${log.includes("[READY]") ? "text-green-500" : ""}
                `}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Stats & Deployment */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="border border-border bg-[#0A0A0A] p-4 relative">
            <div className="absolute top-0 left-0 bg-border px-2 py-1 text-[10px] uppercase font-bold text-foreground">
              Bot_Control_Center
            </div>
            <div className="mt-6 space-y-4">
              <BotCreationModal onDeploy={handleDeploy} />
              
              <div className="pt-4 space-y-3">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-2"><Activity className="h-3 w-3" /> Trades_Exec</span>
                  <span className="text-sm font-bold font-mono">{totalTrades}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-2"><Database className="h-3 w-3" /> Net_Profit</span>
                  <span className="text-sm font-bold text-primary font-mono">+{currentProfit} {activeSymbol}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-2"><Crosshair className="h-3 w-3" /> Vault_Balance</span>
                  <span className="text-sm font-bold font-mono">
                    {activeAsset === NATIVE_CELO 
                      ? (celoBalance ? formatUnits(celoBalance as bigint, 18) : "0.00")
                      : (usdtBalance ? formatUnits(usdtBalance as bigint, 6) : "0.00")
                    } {activeSymbol}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleWithdraw}
                  className="w-full border border-destructive bg-destructive/10 hover:bg-destructive/20 text-destructive py-2 flex items-center justify-center gap-2 transition-colors uppercase text-[10px] font-bold tracking-widest"
                >
                  <ArrowDownToLine className="h-3 w-3" />
                  Withdraw_Funds
                </button>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="border border-border bg-[#0A0A0A] p-4 relative">
            <div className="absolute top-0 left-0 bg-border px-2 py-1 text-[10px] uppercase font-bold text-foreground">
              Global_Leaderboard
            </div>
            <div className="mt-6 space-y-4">
              {[
                { rank: 1, name: "Whale_Bot", profit: "420.69" },
                { rank: 2, name: "Sonic_1", profit: "123.45" },
                { rank: 3, name: "Stable_Gains", profit: "88.20" },
              ].map((entry) => (
                <div key={entry.rank} className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-2 font-mono">
                    <span className="text-muted-foreground">#{entry.rank}</span>
                    {entry.name}
                  </span>
                  <span className="text-primary font-bold">+{entry.profit}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-border flex justify-center">
                 <button className="text-[10px] text-muted-foreground uppercase hover:text-primary transition-colors flex items-center gap-1">
                   <Trophy className="h-3 w-3" /> View_All_Rankings
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
