"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { ActiveTradesTable } from "@/components/dashboard/ActiveTradesTable";
import { LogViewer } from "@/components/dashboard/LogViewer";
import { ConfigPanel } from "@/components/dashboard/ConfigPanel";
import SignalQueue from "@/components/dashboard/SignalQueue";
import { PortfolioStatus } from "@/components/dashboard/PortfolioStatus";
import { OKXStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

// 차트는 SSR 비활성화
const MainChart = dynamic(
  () => import("@/components/dashboard/MainChart").then((mod) => mod.MainChart),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-[400px] bg-slate-900 border border-slate-800 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-slate-500">차트 로딩 중...</span>
      </div>
    ) 
  }
);

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"로그" | "설정">("로그");
  const [okxStatus, setOkxStatus] = useState<OKXStatus | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC");

  // 심볼 선택 핸들러
  const handleSymbolSelect = useCallback((symbol: string) => {
    // 심볼에서 /USDT 제거
    const cleanSymbol = symbol.replace("/USDT", "").replace("USDT", "");
    setSelectedSymbol(cleanSymbol);
  }, []);

  return (
    <DashboardLayout onStatusChange={setOkxStatus}>
      {/* Summary Cards */}
      <SummaryCards okxStatus={okxStatus} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
        {/* Left: Chart */}
        <div className="lg:col-span-2 xl:col-span-2">
          <MainChart selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />
        </div>

        {/* Right: Portfolio Status */}
        <div className="lg:col-span-2 xl:col-span-1">
          <PortfolioStatus />
        </div>
      </div>

      {/* Second Row: Log/Config + Signal Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        {/* Log/Config Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col h-[280px]">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 shrink-0">
            <button
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "로그"
                  ? "text-green-400 border-b-2 border-green-400 bg-slate-800/30"
                  : "text-slate-400 hover:text-slate-200"
              )}
              onClick={() => setActiveTab("로그")}
            >
              실시간 로그
            </button>
            <button
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "설정"
                  ? "text-green-400 border-b-2 border-green-400 bg-slate-800/30"
                  : "text-slate-400 hover:text-slate-200"
              )}
              onClick={() => setActiveTab("설정")}
            >
              설정
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "로그" && <LogViewer />}
            {activeTab === "설정" && <ConfigPanel />}
          </div>
        </div>
        
        {/* Signal Queue */}
        <SignalQueue />
      </div>

      {/* Active Trades Table */}
      <div className="mt-3">
        <ActiveTradesTable onSymbolClick={handleSymbolSelect} />
      </div>
    </DashboardLayout>
  );
}
