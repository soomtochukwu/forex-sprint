"use client";

import { motion } from "framer-motion";
import { Zap, Shield, Rocket } from "lucide-react";

interface Bot {
  id: string;
  name: string;
  avatarId: number;
  profit: string;
  isActive: boolean;
  progress: number; // 0 to 100
  symbol: string;
}

const AVATARS = [
  { icon: Rocket, color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { icon: Shield, color: "text-green-500", bg: "bg-green-500/10" },
];

export function BotTrack({ bots }: { bots: Bot[] }) {
  return (
    <div className="border border-border bg-[#0A0A0A] p-6 relative overflow-hidden min-h-[300px]">
      <div className="absolute top-0 left-0 bg-border px-2 py-1 text-[10px] uppercase font-bold text-foreground z-10">
        Live_Race_Track
      </div>

      <div className="mt-8 space-y-8">
        {bots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground italic text-sm">
            No bots active on the track.
          </div>
        ) : (
          bots.map((bot) => {
            const Avatar = AVATARS[bot.avatarId % AVATARS.length].icon;
            const colors = AVATARS[bot.avatarId % AVATARS.length];

            return (
              <div key={bot.id} className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${bot.isActive ? "bg-primary animate-pulse" : "bg-muted"}`} />
                    {bot.name}
                  </span>
                  <span className="text-xs font-mono text-primary">+{bot.profit} {bot.symbol}</span>
                </div>
                
                <div className="h-4 w-full bg-border/20 rounded-full relative overflow-hidden">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex justify-between px-2 opacity-10">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="w-px h-full bg-foreground" />
                    ))}
                  </div>

                  {/* The Bot Agent */}
                  <motion.div
                    className={`absolute top-0 h-full ${colors.bg} border-r-2 border-primary flex items-center justify-end px-1`}
                    initial={{ width: "0%" }}
                    animate={{ width: `${bot.progress}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 20 }}
                  >
                    <Avatar className={`h-3 w-3 ${colors.color}`} />
                  </motion.div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
