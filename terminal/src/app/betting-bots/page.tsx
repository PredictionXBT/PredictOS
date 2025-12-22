"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Bot } from "lucide-react";
import BettingBotTerminal from "@/components/BettingBotTerminal";
import BettingBotTerminalLadder from "@/components/BettingBotTerminalLadder";
import Sidebar from "@/components/Sidebar";

type BotVersion = "vanilla" | "ladder";

const BOT_VERSIONS: { 
  value: BotVersion; 
  label: string; 
  description: string;
  author: string;
  authorLink?: string;
}[] = [
  { 
    value: "vanilla", 
    label: "Polymarket Arb Bot: Vanilla",
    description: "Simple single-price straddle orders",
    author: "PredictionXBT",
    authorLink: "https://x.com/prediction_xbt"
  },
  { 
    value: "ladder", 
    label: "Polymarket Arb Bot: Ladder Mode",
    description: "Multi-level ladder with position tracking",
    author: "Mining helium",
    authorLink: "https://x.com/mininghelium1/status/2002399561520656424"
  },
];

export default function BettingBotsPage() {
  const [selectedVersion, setSelectedVersion] = useState<BotVersion>("vanilla");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedBot = BOT_VERSIONS.find(v => v.value === selectedVersion);

  return (
    <div className="flex h-screen">
      {/* Sidebar Navigation */}
      <div className="relative z-10 overflow-visible">
        <Sidebar activeTab="betting-bots" />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {/* Version Selector Dropdown - Top Right */}
        <div className="absolute top-4 right-4 z-50" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/90 border border-border hover:border-primary/50 transition-all backdrop-blur-sm shadow-lg"
          >
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-foreground">{selectedBot?.label}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
              {BOT_VERSIONS.map((version) => (
                <button
                  key={version.value}
                  type="button"
                  onClick={() => {
                    setSelectedVersion(version.value);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex flex-col items-start gap-1 px-4 py-3 text-left transition-colors ${
                    selectedVersion === version.value
                      ? "bg-primary/20 border-l-2 border-l-primary"
                      : "hover:bg-secondary border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bot className={`w-4 h-4 ${selectedVersion === version.value ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`font-mono text-sm ${selectedVersion === version.value ? "text-primary" : "text-foreground"}`}>
                      {version.label}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-6">
                    {version.description}. Built by{" "}
                    {version.authorLink ? (
                      <a
                        href={version.authorLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary hover:underline"
                      >
                        {version.author}
                      </a>
                    ) : (
                      <span className="text-foreground">{version.author}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Render the appropriate bot terminal */}
        {selectedVersion === "vanilla" ? (
          <BettingBotTerminal />
        ) : (
          <BettingBotTerminalLadder />
        )}
      </main>
    </div>
  );
}
