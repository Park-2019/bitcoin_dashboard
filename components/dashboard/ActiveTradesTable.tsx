"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { api, Signal } from "@/lib/api";
import { XCircle, MoreVertical, RefreshCw, Search, TrendingUp, TrendingDown } from "lucide-react";

interface ActiveTradesTableProps {
    onSymbolClick?: (symbol: string) => void;
}

export function ActiveTradesTable({ onSymbolClick }: ActiveTradesTableProps) {
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");
    const [showFilter, setShowFilter] = useState(false);
    const [closingId, setClosingId] = useState<string | null>(null);

    // 시그널 조회
    const fetchSignals = useCallback(async () => {
        try {
            // 먼저 가격 업데이트
            await api.updateSignals();
            
            // 시그널 조회
            const response = await api.getSignals();
            if (response.success && response.data) {
                setSignals(response.data);
            }
        } catch (error) {
            console.error("Signals fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSignals();
        const interval = setInterval(fetchSignals, 3000); // 3초마다 갱신
        return () => clearInterval(interval);
    }, [fetchSignals]);

    // 시그널 종료
    const handleClose = async (signalId: string) => {
        if (closingId) return;
        
        setClosingId(signalId);
        try {
            const response = await api.closeSignal(signalId);
            if (response.success) {
                await fetchSignals();
            }
        } catch (error) {
            console.error("Close signal error:", error);
        } finally {
            setClosingId(null);
        }
    };

    const filteredSignals = signals.filter(signal =>
        signal.symbol.toLowerCase().includes(filterText.toLowerCase())
    );

    const formatPrice = (price: number) => {
        if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (price >= 1) return price.toFixed(4);
        return price.toFixed(6);
    };

    const formatDuration = (createdAt: string) => {
        const created = new Date(createdAt);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-800">
                <h3 className="font-semibold text-slate-100">활성 시그널</h3>
                <div className="flex items-center space-x-2">
                    <button
                        className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
                        onClick={() => setShowFilter(!showFilter)}
                    >
                        <Search className="w-4 h-4" />
                    </button>
                    <button 
                        className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
                        onClick={fetchSignals}
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                    <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">
                        {filteredSignals.length} 건
                    </span>
                </div>
            </div>

            {/* Filter */}
            {showFilter && (
                <div className="px-4 py-2 border-b border-slate-800">
                    <input
                        type="text"
                        placeholder="심볼 검색..."
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-green-500"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                    <thead className="bg-slate-800/50">
                        <tr>
                            <th className="text-left px-4 py-2 text-slate-400 font-medium">심볼</th>
                            <th className="text-center px-2 py-2 text-slate-400 font-medium">방향</th>
                            <th className="text-right px-2 py-2 text-slate-400 font-medium">진입가</th>
                            <th className="text-right px-2 py-2 text-slate-400 font-medium">현재가</th>
                            <th className="text-right px-2 py-2 text-slate-400 font-medium">손익률</th>
                            <th className="text-right px-2 py-2 text-slate-400 font-medium">신뢰도</th>
                            <th className="text-right px-2 py-2 text-slate-400 font-medium">보유시간</th>
                            <th className="text-right px-2 py-2 text-slate-400 font-medium">손절/익절</th>
                            <th className="text-right px-4 py-2 text-slate-400 font-medium">액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && signals.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center py-8 text-slate-500">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                                    로딩 중...
                                </td>
                            </tr>
                        ) : filteredSignals.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center py-8 text-slate-500">
                                    활성 시그널이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            filteredSignals.map((signal) => (
                                <tr key={signal.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                    <td className="px-4 py-2">
                                        <button 
                                            className="flex items-center gap-2 hover:text-green-400 transition-colors group"
                                            onClick={() => onSymbolClick?.(signal.symbol)}
                                            title="차트에서 보기"
                                        >
                                            <span className="font-medium text-slate-200 group-hover:text-green-400">{signal.symbol}</span>
                                            {signal.market_phase && (
                                                <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                                                    {signal.market_phase}
                                                </span>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                        <span className={cn(
                                            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold",
                                            signal.direction === "long" 
                                                ? "bg-green-500/20 text-green-400" 
                                                : "bg-red-500/20 text-red-400"
                                        )}>
                                            {signal.direction === "long" ? (
                                                <><TrendingUp className="w-3 h-3" /> 롱</>
                                            ) : (
                                                <><TrendingDown className="w-3 h-3" /> 숏</>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-400">
                                        {formatPrice(signal.entry_price)}
                                    </td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-200">
                                        {formatPrice(signal.current_price)}
                                    </td>
                                    <td className={cn(
                                        "px-2 py-2 text-right font-mono font-bold",
                                        signal.pnl_percent > 0 ? "text-green-400" : 
                                        signal.pnl_percent < 0 ? "text-red-400" : "text-slate-400"
                                    )}>
                                        {signal.pnl_percent > 0 ? "+" : ""}{signal.pnl_percent.toFixed(2)}%
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                        <span className={cn(
                                            "font-mono text-xs px-1.5 py-0.5 rounded",
                                            signal.confidence >= 80 ? "bg-green-500/20 text-green-400" :
                                            signal.confidence >= 70 ? "bg-amber-500/20 text-amber-400" :
                                            "bg-slate-700 text-slate-400"
                                        )}>
                                            {signal.confidence.toFixed(0)}%
                                        </span>
                                    </td>
                                    <td className="px-2 py-2 text-right text-slate-500">
                                        {formatDuration(signal.created_at)}
                                    </td>
                                    <td className="px-2 py-2 text-right text-slate-500 font-mono text-xs">
                                        <span className="text-red-400">{formatPrice(signal.stop_loss)}</span>
                                        <span className="text-slate-600 mx-1">/</span>
                                        <span className="text-green-400">{formatPrice(signal.take_profit)}</span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <button 
                                            className={cn(
                                                "inline-flex items-center gap-1 px-2 py-1 text-xs rounded",
                                                "bg-red-500/20 text-red-400 hover:bg-red-500/30",
                                                closingId === signal.id && "opacity-50 cursor-not-allowed"
                                            )}
                                            onClick={() => handleClose(signal.id)}
                                            disabled={closingId === signal.id}
                                        >
                                            {closingId === signal.id ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <XCircle className="w-3 h-3" />
                                            )}
                                            종료
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
