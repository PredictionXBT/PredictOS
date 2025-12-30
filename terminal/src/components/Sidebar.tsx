"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Copy, 
  ChevronLeft,
  ChevronRight,
  Bot,
  Blocks,
  Globe,
  Wand2,
  Fish,
  ArrowLeftRight,
  Coins,
  TrendingUp,
  Eye
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
}

const navItems = [
  { id: "analysis", label: "Predict Super Intelligence", icon: BarChart3, available: true, href: "/market-analysis" },
  { id: "betting-bots", label: "Betting Bots", icon: Bot, available: true, href: "/betting-bots" },
  { id: "wallet-tracking", label: "Wallet Tracking", icon: Eye, available: true, href: "/wallet-tracking" },
  { id: "no-code-builder", label: "No Code Builder", icon: Wand2, available: false },
  { id: "whale-tracking", label: "Whale Tracking", icon: Fish, available: false },
  { id: "copytrading", label: "Copytrading", icon: Copy, available: false },
  { id: "arbitrage", label: "Arbitrage Opportunity", icon: ArrowLeftRight, available: false },
  { id: "perps", label: "Perps Trading / Leverage", icon: TrendingUp, available: false },
  { id: "staking", label: "$Predict Staking", icon: Coins, available: false },
  { id: "sdk", label: "Predict Protocol SDK", icon: Blocks, available: false },
];

export function Sidebar({ activeTab }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "h-screen bg-sidebar terminal-border border-r flex flex-col transition-all duration-300 relative overflow-visible",
        collapsed ? "w-16" : "w-72"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-primary glow-primary flex items-center justify-center bg-primary/10 overflow-hidden shrink-0">
              <Image 
                src="/logo.jpg" 
                alt="PredictOS Logo" 
                width={40} 
                height={40} 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight text-foreground text-glow">
                PredictOS
              </span>
              <span className="text-[10px] font-mono text-primary/80 tracking-widest">
                All-In-One Prediction Market Framework
              </span>
            </div>
          )}
        </Link>
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-primary/20 hover:border-primary/50 transition-colors shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 mt-2 overflow-y-auto">
        {navItems.map((item) => {
          const content = (
            <>
              <item.icon className={cn(
                "w-5 h-5 shrink-0",
                activeTab === item.id && item.available && "text-primary",
                !item.available && "opacity-40"
              )} />
              {!collapsed && (
                <div className="flex items-center gap-2 flex-1">
                  <span className={cn("text-sm font-medium truncate", !item.available && "opacity-40")}>{item.label}</span>
                  {!item.available && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/30 text-destructive border border-destructive font-mono uppercase font-bold">
                      Soon
                    </span>
                  )}
                </div>
              )}
            </>
          );

          const className = cn(
            "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200",
            item.available ? "hover:bg-secondary/50 cursor-pointer" : "cursor-not-allowed",
            activeTab === item.id && item.available
              ? "bg-primary/10 terminal-border-glow text-primary" 
              : "text-muted-foreground hover:text-foreground"
          );

          if (item.available && item.href) {
            return (
              <Link key={item.id} href={item.href} className={className}>
                {content}
              </Link>
            );
          }

          return (
            <div key={item.id} className={className}>
              {content}
            </div>
          );
        })}
      </nav>

      {/* Powered By Section */}
      <div className="px-3 py-2 border-t border-border/50">
        {!collapsed ? (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
              Powered by
            </span>
            <div className="flex items-center gap-3">
              {/* DFlow */}
              <a
                href="https://pond.dflow.net/introduction"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all group"
              >
                <Image 
                  src="/Dflow_logo.png" 
                  alt="DFlow" 
                  width={16} 
                  height={16} 
                  className="rounded-sm"
                />
                <span className="text-[10px] font-semibold text-indigo-400 group-hover:text-indigo-300">
                  DFlow
                </span>
              </a>
              
              {/* Dome */}
              <a
                href="https://domeapi.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all group"
              >
                <Image 
                  src="/dome-icon-light.svg" 
                  alt="Dome" 
                  width={16} 
                  height={16}
                />
                <span className="text-[10px] font-semibold text-emerald-400 group-hover:text-emerald-300">
                  Dome
                </span>
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <a
              href="https://pond.dflow.net/introduction"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-md bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all flex items-center justify-center"
              title="DFlow"
            >
              <Image 
                src="/Dflow_logo.png" 
                alt="DFlow" 
                width={18} 
                height={18} 
                className="rounded-sm"
              />
            </a>
            <a
              href="https://domeapi.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all flex items-center justify-center"
              title="Dome"
            >
              <Image 
                src="/dome-icon-light.svg" 
                alt="Dome" 
                width={18} 
                height={18}
              />
            </a>
          </div>
        )}
      </div>

      {/* Social Links & Version */}
      <div className="p-3 border-t border-border/50">
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "flex-row justify-between")}>
          <div className={cn("flex gap-2", collapsed ? "flex-col items-center" : "flex-row")}>
            {/* X (Twitter) Link */}
            <a
              href="https://x.com/prediction_xbt"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/50 border border-border/50 hover:bg-secondary hover:border-primary/50 transition-all text-muted-foreground hover:text-foreground"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            
            {/* GitHub Link */}
            <a
              href="https://github.com/PredictionXBT/PredictOS"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/50 border border-border/50 hover:bg-secondary hover:border-primary/50 transition-all text-muted-foreground hover:text-foreground"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
            
            {/* Website Link */}
            <a
              href="https://predictionxbt.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/50 border border-border/50 hover:bg-secondary hover:border-primary/50 transition-all text-muted-foreground hover:text-foreground"
            >
              <Globe className="w-3.5 h-3.5" />
            </a>
          </div>
          
          {/* Version Tag */}
          <span className="text-[10px] px-2 py-0.5 rounded bg-success/20 text-success border border-success font-mono font-bold">
            v2.2.0
          </span>
        </div>
      </div>

    </aside>
  );
}

export default Sidebar;

