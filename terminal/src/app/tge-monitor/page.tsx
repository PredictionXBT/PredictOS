"use client";

import TgeMonitorTerminal from "@/components/TgeMonitorTerminal";
import Sidebar from "@/components/Sidebar";

export default function TgeMonitorPage() {
  return (
    <div className="flex h-screen">
      <div className="relative z-10 overflow-visible">
        <Sidebar activeTab="tge-monitor" />
      </div>

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <TgeMonitorTerminal />
      </main>
    </div>
  );
}

