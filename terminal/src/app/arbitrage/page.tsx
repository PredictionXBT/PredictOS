"use client";

import ArbitrageTerminal from "@/components/ArbitrageTerminal";
import Sidebar from "@/components/Sidebar";

export default function ArbitragePage() {
  return (
    <div className="flex h-screen">
      {/* Sidebar Navigation */}
      <div className="relative z-10 overflow-visible">
        <Sidebar activeTab="arbitrage" />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <ArbitrageTerminal />
      </main>
    </div>
  );
}

