"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Terminal, Github } from "lucide-react"

import { ConnectButton } from "@/components/connect-button"

export function Navbar() {
  const pathname = usePathname()
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-[#0A0A0A]">
      <div className="container flex h-16 max-w-6xl items-center justify-between px-4 mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Terminal className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg tracking-widest uppercase">
              FS_PROTOCOL
            </span>
          </Link>
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
