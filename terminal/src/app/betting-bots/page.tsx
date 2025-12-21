"use client";

import { Bot, User } from "lucide-react";
import BettingBotTerminal from "@/components/BettingBotTerminal";
import DumpSniperTerminal from "@/components/DumpSniperTerminal";
import Sidebar from "@/components/Sidebar";

export default function BettingBotsPage() {
  return (
    <div className="flex h-screen">
      {/* Sidebar Navigation */}
      <div className="relative z-10 overflow-visible">
        <Sidebar activeTab="betting-bots" />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="max-w-2xl mx-auto px-4">
            {/* Page Title */}
            <div className="flex items-center gap-3 py-4">
              <Bot className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Betting Bots</h1>
                <p className="text-xs text-muted-foreground">
                  Polymarket 15-minute up/down market strategies
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bot Terminals */}
        <div className="py-4 space-y-6">
          <BettingBotTerminal />
          <DumpSniperTerminal />
        </div>

        {/* Developer Credit */}
        <div className="max-w-2xl mx-auto px-4 pb-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground border-t border-border pt-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span>
              Ladder Bot & Dump Sniper developed by{" "}
              <a
                href="https://x.com/mininghelium1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                @mininghelium1
              </a>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
