"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { api, OKXStatus, Stats } from "@/lib/api";
import { 
    LayoutDashboard, 
    LineChart, 
    Wallet, 
    ScrollText, 
    Settings,
    History,
    Bot,
    ChevronRight,
    X,
    RefreshCw
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
    onClose?: () => void;
}

const navItems = [
    { name: "대시보드", href: "/", icon: LayoutDashboard },
    { name: "트레이딩", href: "/trading", icon: LineChart },
    { name: "거래내역", href: "/history", icon: History },
    { name: "포트폴리오", href: "/portfolio", icon: Wallet },
    { name: "로그", href: "/logs", icon: ScrollText },
    { name: "설정", href: "/settings", icon: Settings },
];

export function Sidebar({ onClose }: SidebarProps) {
    const pathname = usePathname();
    const [stats, setStats] = useState<Stats | null>(null);
    const [okxStatus, setOkxStatus] = useState<OKXStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, okxRes] = await Promise.all([
                    api.getStats(),
                    api.getOKXStatus()
                ]);
                
                if (statsRes.success && statsRes.data) {
                    setStats(statsRes.data);
                }
                if (okxRes.success && okxRes.data) {
                    setOkxStatus(okxRes.data);
                }
            } catch (error) {
                console.error("Sidebar data fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    // 데이터 추출
    const activeSignals = stats?.active_signals || 0;
    const dailyPnl = okxStatus?.wallet?.daily_pnl || 0;
    const totalBalance = okxStatus?.wallet?.total_balance || okxStatus?.balance?.total || 0;
    const totalReturnPercent = okxStatus?.stats?.total_return_percent || 0;

    return (
        <div className="w-56 h-full bg-slate-950 border-r border-slate-800 flex flex-col">
            {/* Logo / Title */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-green-500" />
                    <span className="font-bold text-slate-100 text-sm tracking-wide">
                        퀀트 봇
                    </span>
                </div>
                {onClose && (
                    <button 
                        className="md:hidden p-1 text-slate-400 hover:text-slate-200"
                        onClick={onClose}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 group",
                                isActive 
                                    ? "bg-green-500/10 text-green-400 border-l-2 border-green-500" 
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                            )}
                        >
                            <item.icon className={cn(
                                "w-4 h-4 mr-3 transition-colors",
                                isActive ? "text-green-400" : "text-slate-500 group-hover:text-slate-300"
                            )} />
                            {item.name}
                            {isActive && (
                                <ChevronRight className="w-4 h-4 ml-auto text-green-500" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bot Summary - Bottom */}
            <div className="p-3 border-t border-slate-800">
                <div className="bg-slate-900/50 rounded-lg p-3 text-xs space-y-2">
                    <div className="flex justify-between text-slate-400">
                        <span>활성 포지션</span>
                        {loading ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                        ) : (
                            <span className="text-slate-200 font-medium">{activeSignals}</span>
                        )}
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>일일 손익</span>
                        {loading ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                        ) : (
                            <span className={cn(
                                "font-medium",
                                dailyPnl >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                                {dailyPnl >= 0 ? "+" : ""}${dailyPnl.toFixed(2)}
                            </span>
                        )}
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>총 자산</span>
                        {loading ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                        ) : (
                            <span className={cn(
                                "font-medium",
                                totalReturnPercent >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                                ${totalBalance.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                            </span>
                        )}
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>수익률</span>
                        {loading ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                        ) : (
                            <span className={cn(
                                "font-medium",
                                totalReturnPercent >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                                {totalReturnPercent >= 0 ? "+" : ""}{totalReturnPercent.toFixed(2)}%
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
