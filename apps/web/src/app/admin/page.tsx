"use client";

import React, { useState } from "react";
import { Shield, Settings, Wallet, UserCheck, AlertTriangle } from "lucide-react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatUnits } from "viem";
import { VAULT_ADDRESS, USDT_ADDRESS, NATIVE_CELO } from "@/lib/constants";
import { VAULT_ABI } from "@/lib/abis";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  // 1. Check if user is owner
  const { data: owner } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "owner",
  });

  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase();

  // 2. Read Protocol Fees
  const { data: usdtFees, refetch: refetchUsdtFees } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "protocolFees",
    args: [USDT_ADDRESS],
  });

  const { data: celoFees, refetch: refetchCeloFees } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "protocolFees",
    args: [NATIVE_CELO],
  });

  const [solverAddress, setSolverAddress] = useState("");

  const handleWithdrawFees = (token: string) => {
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "withdrawProtocolFees",
      args: [token as `0x${string}`],
    });
  };

  const handleSetSolver = (status: boolean) => {
    if (!solverAddress.startsWith("0x")) return;
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "setSolver",
      args: [solverAddress as `0x${string}`, status],
    });
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground uppercase tracking-widest text-sm font-bold">Connect_Wallet_to_Access_Admin</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-destructive">
        <AlertTriangle className="h-12 w-12" />
        <p className="uppercase tracking-widest text-sm font-bold">Access_Denied // Unauthorized_User</p>
        <p className="text-muted-foreground text-xs font-mono">Owner: {owner as string}</p>
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <header className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2 uppercase tracking-tighter">
          <Shield className="h-8 w-8" />
          Admin_Terminal
        </h1>
        <p className="text-muted-foreground mt-1 font-mono text-xs uppercase">
          FS_Protocol Management Interface
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Fees Management */}
        <div className="border border-border bg-[#0A0A0A] p-6 relative">
          <div className="absolute top-0 left-0 bg-border px-2 py-1 text-[10px] uppercase font-bold text-foreground">
            Protocol_Revenue
          </div>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Accumulated USDT</span>
                <span className="text-xl font-mono text-primary">{usdtFees ? formatUnits(usdtFees as bigint, 6) : "0.00"}</span>
              </div>
              <Button 
                onClick={() => handleWithdrawFees(USDT_ADDRESS)}
                className="w-full h-8 text-[10px] uppercase font-bold tracking-widest"
                variant="outline"
              >
                Withdraw_USDT_Fees
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Accumulated CELO</span>
                <span className="text-xl font-mono text-primary">{celoFees ? formatUnits(celoFees as bigint, 18) : "0.00"}</span>
              </div>
              <Button 
                onClick={() => handleWithdrawFees(NATIVE_CELO)}
                className="w-full h-8 text-[10px] uppercase font-bold tracking-widest"
                variant="outline"
              >
                Withdraw_CELO_Fees
              </Button>
            </div>
          </div>
        </div>

        {/* Solver Management */}
        <div className="border border-border bg-[#0A0A0A] p-6 relative">
          <div className="absolute top-0 left-0 bg-border px-2 py-1 text-[10px] uppercase font-bold text-foreground">
            Solver_Whitelist
          </div>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Solver Address</label>
              <input
                value={solverAddress}
                onChange={(e) => setSolverAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-input border border-border p-2 text-xs font-mono outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleSetSolver(true)}
                className="flex-1 h-10 text-[10px] uppercase font-bold bg-primary/10 text-primary border-primary/50 hover:bg-primary/20"
                variant="outline"
              >
                Authorize
              </Button>
              <Button 
                onClick={() => handleSetSolver(false)}
                className="flex-1 h-10 text-[10px] uppercase font-bold bg-destructive/10 text-destructive border-destructive/50 hover:bg-destructive/20"
                variant="outline"
              >
                Revoke
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
