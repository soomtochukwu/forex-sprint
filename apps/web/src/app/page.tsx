"use client";

import React, { useState, useEffect } from "react";
import { Terminal, Activity, Database, Crosshair, Trophy } from "lucide-react";
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { VAULT_ADDRESS, USDM_ADDRESS } from "@/lib/constants";
import { VAULT_ABI } from "@/lib/abis";
import { BotTrack } from "@/components/bot-track";
import { BotCreationModal } from "@/components/bot-creation-modal";

export default function Home() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  // 1. Read User Balance in Vault
  const { data: vaultBalance, refetch: refetchBalance } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "balances",
    args: [address!, USDM_ADDRESS],
    query: { enabled: !!address }
  });

  // 2. Read Bot Config
  const { data: botConfig } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "botConfigs",
    args: [address!, USDM_ADDRESS],
    query: { enabled: !!address }
  });

  // 3. Read Bot Metadata
  const { data: botMetadata, refetch: refetchMeta } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "botMetadata",
    args: [address!, USDM_ADDRESS],
    query: { enabled: !!address }
  });

  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Initializing Forex Sprint engine...",
    "[SYSTEM] Connected to Celo Mainnet.",
    "[SYSTEM] Loading Ubeswap & Uniswap V3 interfaces...",
    "[READY] Waiting for user deployment.",
  ]);

  // Watch for execution events
  useWatchContractEvent({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    eventName: "ArbitrageExecuted",
    onLogs(logs) {
      const myLog = logs.find(l => (l as any).args.user === address);
      if (myLog) {
        const profit = formatUnits((myLog as any).args.profit, 18);
        setLogs(prev => [...prev, `[EXEC] PROFIT REALIZED: +${profit} USDm`]);
        refetchBalance();
        refetchMeta();
      }
    },
  });

  const handleDeploy = (name: string, avatarId: number, capital: string) => {
    setLogs((prev) => [
      ...prev,
      `[EXEC] Deploying Agent Bot "${name}"...`,
      `[INFO] Target spread: > 0.01%`,
      `[INFO] Capital: ${capital} USDm`,
    ]);

    // Note: In real app, need to check allowance first
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "configureBot",
      args: [USDM_ADDRESS, 1n, true, name, avatarId],
    });
  };

  const isActive = botConfig ? (botConfig as any)[1] : false;
  const currentProfit = botMetadata ? formatUnits((botMetadata as any)[3], 18) : "0.00";
  const totalTrades = botMetadata ? (botMetadata as any)[2].toString() : "0";

  // Mock track data based on real bot
  const activeBots = botMetadata && isActive ? [
    {
      id: "my-bot",
      name: (botMetadata as any)[0],
      avatarId: (botMetadata as any)[1],
      profit: currentProfit,
      isActive: true,
      progress: 65, // mock progress
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
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Status</div>
          <div className="text-sm flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-primary font-bold">SYSTEM_ONLINE</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Controls & Track */}
        <div className="lg:col-span-2 flex flex-col gap-6">
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
                  <span className="text-sm font-bold text-primary font-mono">+{currentProfit} USDm</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-2"><Crosshair className="h-3 w-3" /> Vault_Balance</span>
                  <span className="text-sm font-bold font-mono">
                    {vaultBalance ? formatUnits(vaultBalance as bigint, 18) : "0.00"} USDm
                  </span>
                </div>
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
