"use client";

import React, { useState, useEffect } from "react";
import { Terminal, Play, Square, Activity, Database, Crosshair } from "lucide-react";
import { useAccount } from "wagmi";

export default function Home() {
  const { address } = useAccount();
  const [botActive, setBotActive] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Initializing Forex Sprint engine...",
    "[SYSTEM] Connected to Celo Mainnet.",
    "[SYSTEM] Loading Ubeswap & Uniswap V3 interfaces...",
    "[READY] Waiting for user deployment.",
  ]);

  const handleDeploy = () => {
    setBotActive(true);
    setLogs((prev) => [
      ...prev,
      `[EXEC] Deploying Agent Bot to 0x...${address?.slice(-4) || "0000"}`,
      `[INFO] Target spread: > 0.01%`,
      `[INFO] Scanning mempool for arbitrage routes...`,
    ]);
  };

  const handleStop = () => {
    setBotActive(false);
    setLogs((prev) => [
      ...prev,
      `[EXEC] Halting Agent Bot.`,
      `[SYSTEM] Bot retired safely. Funds secured in vault.`,
    ]);
  };

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
        {/* Left Column - Controls */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="border border-border bg-[#0A0A0A] p-4 relative">
            <div className="absolute top-0 left-0 bg-border px-2 py-1 text-[10px] uppercase font-bold text-foreground">
              Deployment_Config
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1 block">Allocated Capital (USDm)</label>
                <div className="flex items-center border border-border bg-input p-2">
                  <span className="text-primary mr-2">~%</span>
                  <input 
                    type="number" 
                    defaultValue="10.00"
                    className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1 block">Min Spread Threshold</label>
                <div className="flex items-center border border-border bg-input p-2">
                  <span className="text-primary mr-2">~%</span>
                  <input 
                    type="text" 
                    defaultValue="> 0.01%"
                    className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="pt-4">
                {!botActive ? (
                  <button 
                    onClick={handleDeploy}
                    className="w-full border border-primary bg-primary/10 hover:bg-primary/20 text-primary py-3 flex items-center justify-center gap-2 transition-colors uppercase text-sm font-bold tracking-widest"
                  >
                    <Play className="h-4 w-4" />
                    Execute_Deploy
                  </button>
                ) : (
                  <button 
                    onClick={handleStop}
                    className="w-full border border-destructive bg-destructive/10 hover:bg-destructive/20 text-destructive py-3 flex items-center justify-center gap-2 transition-colors uppercase text-sm font-bold tracking-widest"
                  >
                    <Square className="h-4 w-4" />
                    Halt_Process
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="border border-border bg-[#0A0A0A] p-4 relative">
            <div className="absolute top-0 left-0 bg-border px-2 py-1 text-[10px] uppercase font-bold text-foreground">
              Live_Metrics
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-xs text-muted-foreground flex items-center gap-2"><Activity className="h-3 w-3" /> Trades_Exec</span>
                <span className="text-sm font-bold">{botActive ? "42" : "0"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-xs text-muted-foreground flex items-center gap-2"><Database className="h-3 w-3" /> Total_Profit</span>
                <span className="text-sm font-bold text-primary">{botActive ? "+ 1.42 USDm" : "0.00 USDm"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-2"><Crosshair className="h-3 w-3" /> Win_Rate</span>
                <span className="text-sm font-bold">100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Terminal Log */}
        <div className="lg:col-span-2">
          <div className="border border-border bg-[#0A0A0A] h-full relative flex flex-col min-h-[400px]">
            <div className="absolute top-0 left-0 bg-border px-2 py-1 text-[10px] uppercase font-bold text-foreground z-10 flex w-full justify-between items-center">
              <span>StdOut // Arbitrage_Log</span>
              <span className="text-muted-foreground">TCP:443</span>
            </div>
            
            <div className="mt-8 p-4 flex-1 overflow-y-auto space-y-2 font-mono text-sm">
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
              
              {botActive && (
                <div className="flex items-center gap-2 text-primary animate-pulse mt-4">
                  <Terminal className="h-4 w-4" />
                  <span>Scanning liquidity pools...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
