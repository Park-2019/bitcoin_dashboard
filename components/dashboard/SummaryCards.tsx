"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { api, Stats, OKXStatus, MarketMetrics } from "@/lib/api";
import { 
    ArrowUpRight, 
    ArrowDownRight, 
    Wallet, 
    Crosshair, 
    TrendingUp, 
    TrendingDown,
    Clock,
    Target,
    Percent,
    Activity,
    RefreshCw
} from "lucide-react";

interface SummaryCardProps {
    label: string;
    value: string;
    subValue?: string;
    trend?: "up" | "down" | "neutral";
    icon: React.ElementType;
    loading?: boolean;
}

function SummaryCard({ label, value, subValue, trend, icon: Icon, loading }: SummaryCardProps) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-slate-400 mb-1">{label}</p>
                {loading ? (
                    <div className="h-8 w-24 bg-slate-800 rounded animate-pulse" />
                ) : (
                    <h3 className={cn(
                        "text-2xl font-bold tracking-tight",
                        trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-slate-100"
                    )}>
                        {value}
                    </h3>
                )}
                {subValue && !loading && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center">
                        {trend === "up" && <ArrowUpRight className="w-3 h-3 mr-1 text-green-500" />}
                        {trend === "down" && <ArrowDownRight className="w-3 h-3 mr-1 text-red-500" />}
                        {subValue}
                    </p>
                )}
            </div>
            <div className="p-2 bg-slate-800 rounded-md">
                <Icon className="w-4 h-4 text-slate-400" />
            </div>
        </div>
    );
}

interface SecondaryStatProps {
    label: string;
    value: string;
    trend?: "up" | "down" | "neutral";
}

function SecondaryStat({ label, value, trend }: SecondaryStatProps) {
    return (
        <div className="flex items-center justify-between text-sm text-slate-400">
            <span className="font-medium">{label}</span>
            <span className={cn(
                "font-mono",
                trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-slate-300"
            )}>
                {value}
            </span>
        </div>
    );
}

interface SummaryCardsProps {
    okxStatus?: OKXStatus | null;
}

export function SummaryCards({ okxStatus }: SummaryCardsProps) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [market, setMarket] = useState<MarketMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, marketRes] = await Promise.all([
                    api.getStats(),
                    api.getMarket()
                ]);
                
                if (statsRes.success && statsRes.data) {
                    setStats(statsRes.data);
                }
                if (marketRes.success && marketRes.data) {
                    setMarket(marketRes.data);
                }
            } catch (error) {
                console.error("Stats fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    // 데이터 계산
    const balance = okxStatus?.balance;
    const wallet = okxStatus?.wallet;
    const dailyPnl = wallet?.daily_pnl || okxStatus?.stats?.daily_pnl || 0;
    const totalReturnPercent = okxStatus?.stats?.total_return_percent || 0;
    const totalRealizedPnl = wallet?.total_realized_pnl || 0;
    const unrealizedPnl = wallet?.unrealized_pnl || 0;
    const winRate = stats?.win_rate || okxStatus?.stats?.win_rate || 0;
    const activeCount = stats?.active_signals || 0;
    const dailyTrades = wallet?.daily_trades || okxStatus?.stats?.daily_trades || 0;
    const bestTrade = okxStatus?.stats?.best_trade || stats?.best_trade || 0;

    const metrics = [
        {
            label: "총 수익률",
            value: totalReturnPercent >= 0 ? `+${totalReturnPercent.toFixed(2)}%` : `${totalReturnPercent.toFixed(2)}%`,
            subValue: `실현 $${totalRealizedPnl.toFixed(0)} | 미실현 $${unrealizedPnl.toFixed(0)}`,
            trend: totalReturnPercent >= 0 ? "up" as const : "down" as const,
            icon: TrendingUp,
        },
        {
            label: "일일 손익",
            value: dailyPnl >= 0 ? `+$${dailyPnl.toFixed(2)}` : `$${dailyPnl.toFixed(2)}`,
            subValue: `${dailyTrades}건 거래`,
            trend: dailyPnl >= 0 ? "up" as const : "down" as const,
            icon: dailyPnl >= 0 ? TrendingUp : TrendingDown,
        },
        {
            label: "활성 포지션",
            value: String(activeCount),
            subValue: `손절 ${stats?.sl_hit || 0} | 익절 ${stats?.tp_hit || 0}`,
            trend: "neutral" as const,
            icon: Crosshair,
        },
        {
            label: "총 자산",
            value: balance ? `$${balance.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "--",
            subValue: balance ? `사용가능 $${balance.available.toLocaleString(undefined, {minimumFractionDigits: 0})}` : "연결 대기중",
            trend: totalReturnPercent >= 0 ? "up" as const : "down" as const,
            icon: Wallet,
        },
    ];

    const secondaryStats = [
        { 
            label: "승률", 
            value: `${winRate.toFixed(1)}%`, 
            trend: winRate >= 50 ? "up" as const : "down" as const 
        },
        { 
            label: "평균 손익", 
            value: stats?.avg_pnl ? `${stats.avg_pnl.toFixed(2)}%` : "--", 
            trend: (stats?.avg_pnl || 0) >= 0 ? "up" as const : "down" as const 
        },
        { 
            label: "최고 거래", 
            value: bestTrade > 0 ? `+${bestTrade.toFixed(2)}%` : "--", 
            trend: "up" as const 
        },
        { 
            label: "오늘 거래", 
            value: `${dailyTrades}건`, 
            trend: "neutral" as const 
        },
        { 
            label: "BTC", 
            value: market?.btc_price ? `$${market.btc_price.toLocaleString()}` : "--", 
            trend: (market?.btc_change_24h || 0) >= 0 ? "up" as const : "down" as const 
        },
        { 
            label: "공포/탐욕", 
            value: market?.fear_greed_index ? `${market.fear_greed_index}` : "--", 
            trend: (market?.fear_greed_index || 50) >= 50 ? "up" as const : "down" as const 
        },
    ];

    return (
        <div className="space-y-3">
            {/* Main Metrics - 4 cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {metrics.map((metric) => (
                    <SummaryCard 
                        key={metric.label} 
                        {...metric} 
                        loading={loading}
                    />
                ))}
            </div>

            {/* Secondary Stats Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-100">보조 통계</h3>
                    {loading && <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />}
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-1 text-xs">
                    {secondaryStats.map((stat) => (
                        <SecondaryStat key={stat.label} {...stat} />
                    ))}
                </div>
            </div>
        </div>
    );
}
