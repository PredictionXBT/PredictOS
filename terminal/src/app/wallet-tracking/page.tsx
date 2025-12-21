"use client";

import WalletTrackingTerminal from "@/components/WalletTrackingTerminal";
import Sidebar from "@/components/Sidebar";

export default function WalletTrackingPage() {
  return (
    <div className="flex h-screen">
      {/* Sidebar Navigation */}
      <div className="relative z-10 overflow-visible">
        <Sidebar activeTab="wallet-tracking" />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <WalletTrackingTerminal />
      </main>
    </div>
  );
}

