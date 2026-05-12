"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Rocket, Zap, Shield, Play } from "lucide-react";

const AVATARS = [
  { icon: Rocket, label: "Speedy" },
  { icon: Zap, label: "Flash" },
  { icon: Shield, label: "Steady" },
];

export function BotCreationModal({ onDeploy }: { onDeploy: (name: string, avatarId: number, capital: string) => void }) {
  const [name, setName] = useState("Agent_01");
  const [avatarId, setAvatarId] = useState(0);
  const [capital, setCapital] = useState("10.00");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full border border-primary bg-primary/10 hover:bg-primary/20 text-primary py-3 flex items-center justify-center gap-2 transition-colors uppercase text-sm font-bold tracking-widest h-auto">
          <Play className="h-4 w-4" />
          Deploy_New_Bot
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0A0A0A] border-border text-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold uppercase tracking-widest text-primary">Deploy_Agent_Bot</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-xs uppercase text-muted-foreground">Bot Name</Label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-input border border-border p-2 outline-none focus:border-primary transition-colors text-sm font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs uppercase text-muted-foreground">Select Avatar</Label>
            <div className="flex gap-4">
              {AVATARS.map((avatar, i) => {
                const Icon = avatar.icon;
                return (
                  <button
                    key={i}
                    onClick={() => setAvatarId(i)}
                    className={`flex-1 p-4 border transition-all flex flex-col items-center gap-2 ${
                      avatarId === i ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${avatarId === i ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-[10px] uppercase font-bold">{avatar.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="capital" className="text-xs uppercase text-muted-foreground">Allocated Capital (USDm)</Label>
            <div className="flex items-center border border-border bg-input p-2">
              <span className="text-primary mr-2 font-mono">$</span>
              <input
                id="capital"
                type="number"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground font-mono"
              />
            </div>
          </div>
        </div>
        <Button 
          onClick={() => {
            onDeploy(name, avatarId, capital);
            setOpen(false);
          }}
          className="w-full bg-primary text-primary-foreground font-bold uppercase tracking-widest py-6"
        >
          Confirm_Deployment
        </Button>
      </DialogContent>
    </Dialog>
  );
}
