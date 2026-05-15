"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Terminal, Github, Shield } from "lucide-react"
import { useAccount, useReadContract } from "wagmi"
import { VAULT_ADDRESS } from "@/lib/constants"
import { VAULT_ABI } from "@/lib/abis"

import { ConnectButton } from "@/components/connect-button"

export function Navbar() {
  const pathname = usePathname()
  const { address } = useAccount()

  const { data: owner } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "owner",
  });

  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase();
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-[#0A0A0A]">
      <div className="container flex h-16 max-w-6xl items-center justify-between px-4 mx-auto">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Terminal className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg tracking-widest uppercase">
              FS_PROTOCOL
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/" 
              className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              Race_Track
            </Link>
            {isOwner && (
              <Link 
                href="/admin" 
                className={`text-[10px] uppercase font-bold tracking-widest transition-colors flex items-center gap-1.5 ${pathname === "/admin" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
              >
                <Shield className="h-3 w-3" />
                Admin_Panel
              </Link>
            )}
          </nav>
        </div>
        
        <nav className="flex items-center gap-6">
          <Link
            href="https://github.com/maziofweb3/forex-sprint"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 text-sm font-medium transition-colors text-muted-foreground hover:text-primary uppercase tracking-wider"
          >
            <Github className="h-4 w-4" />
            Source
          </Link>
          
          <div className="flex items-center">
            {/* The terminal aesthetic ConnectButton */}
            <div className="border border-border">
              <ConnectButton />
            </div>
          </div>
        </nav>
      </div>
    </header>
  )
}
