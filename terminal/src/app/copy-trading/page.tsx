"use client";

import CopyTradingTerminal from "@/components/CopyTradingTerminal";
import Sidebar from "@/components/Sidebar";

export default function CopyTradingPage() {
    return (
        <div className="flex h-screen">
            {/* Sidebar Navigation */}
            <div className="relative z-10 overflow-visible">
                <Sidebar activeTab="copytrading" />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
                <CopyTradingTerminal />
            </main>
        </div>
    );
}
