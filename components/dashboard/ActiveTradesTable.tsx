"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { api, Signal, CombinedPosition } from "@/lib/api";
import { 
    XCircle, RefreshCw, Search, TrendingUp, TrendingDown, 
    ChevronUp, ChevronDown, ChevronsUpDown, DollarSign,
    Activity, Target, Clock, Percent, Zap, Bot
} from "lucide-react";

type SortField = "symbol" | "direction" | "entry_price" | "current_price" | "pnl_percent" | "position_usdt" | "unrealized_pnl" | "confidence" | "created_at" | "stop_loss" | "source";
type SortOrder = "asc" | "desc";

interface ActiveTradesTableProps {
    onSymbolClick?: (symbol: string) => void;
}

export function ActiveTradesTable({ onSymbolClick }: ActiveTradesTableProps) {
    const [signals, setSignals] = useState<Signal[]>([]);
    const [okxPositions, setOkxPositions] = useState<CombinedPosition[]>([]);
    const [okxConnected, setOkxConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");
    const [showFilter, setShowFilter] = useState(false);
    const [closingId, setClosingId] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>("unrealized_pnl");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [syncing, setSyncing] = useState(false);

    // 통합 포트폴리오 조회
    const fetchSignals = useCallback(async () => {
        try {
            await api.updateSignals();
            
            // 퀀트봇 시그널
            const response = await api.getSignals();
            if (response.success && response.data) {
                // 출처 추가
                const signalsWithSource = response.data.map(s => ({ ...s, source: 'quant_bot' as const }));
                setSignals(signalsWithSource);
            }
            
            // OKX 포지션 (연결된 경우)
            const okxStatus = await api.getOKXStatus();
            if (okxStatus.success && okxStatus.data?.connected) {
                setOkxConnected(true);
                const positions = await api.getPositions();
                if (positions.success && positions.data) {
                    const okxPos: CombinedPosition[] = positions.data.map(p => ({
                        symbol: p.symbol.replace('-USDT-SWAP', '').replace('-USDT', ''),
                        direction: p.size > 0 ? 'long' : 'short',
                        entry_price: p.entry_price,
                        current_price: p.mark_price,
                        pnl_percent: p.pnl_percent,
                        position_usdt: p.margin * p.leverage,
                        unrealized_pnl: p.pnl,
                        stop_loss: 0,
                        take_profit: 0,
                        confidence: 100,
                        source: 'okx',
                        leverage: p.leverage,
                        liq_price: p.liq_price,
                    }));
                    setOkxPositions(okxPos);
                }
            } else {
                setOkxConnected(false);
                setOkxPositions([]);
            }
        } catch (error) {
            console.error("Portfolio fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, []);
    
    // OKX 포지션 동기화
    const handleSyncPositions = async () => {
        if (syncing) return;
        setSyncing(true);
        try {
            const result = await api.syncOKXPositions();
            if (result.success) {
                await fetchSignals();
            }
        } catch (error) {
            console.error("Sync error:", error);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchSignals();
        const interval = setInterval(fetchSignals, 3000);
        return () => clearInterval(interval);
    }, [fetchSignals]);

    // 시그널 종료 (포지션 청산)
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

    // 정렬 핸들러
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("desc");
        }
    };

    // 정렬 아이콘
    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <ChevronsUpDown className="w-3 h-3 text-slate-600" />;
        }
        return sortOrder === "asc" 
            ? <ChevronUp className="w-3 h-3 text-cyan-400" />
            : <ChevronDown className="w-3 h-3 text-cyan-400" />;
    };

    // 통합 포지션 목록 (퀀트봇 + OKX)
    const allPositions = useMemo(() => {
        // OKX 포지션 심볼 목록
        const okxSymbols = new Set(okxPositions.map(p => p.symbol));
        
        // 시그널에 OKX 실거래 여부 표시
        const combined: Signal[] = signals.map(s => ({
            ...s,
            // 해당 심볼이 OKX에도 있으면 실거래로 표시
            source: okxSymbols.has(s.symbol) ? 'okx' : (s.source || 'quant_bot'),
            // OKX 실거래인 경우 OKX 수익 데이터 사용
            ...(okxSymbols.has(s.symbol) ? (() => {
                const okxPos = okxPositions.find(p => p.symbol === s.symbol);
                return okxPos ? {
                    unrealized_pnl: okxPos.unrealized_pnl,
                    pnl_percent: okxPos.pnl_percent,
                    current_price: okxPos.current_price,
                    position_usdt: okxPos.position_usdt,
                } : {};
            })() : {})
        }));
        
        // OKX 전용 포지션 (시그널에 없는 것) 추가
        for (const pos of okxPositions) {
            const exists = signals.some(s => s.symbol === pos.symbol);
            if (!exists) {
                combined.push({
                    id: `okx_${pos.symbol}`,
                    symbol: pos.symbol,
                    direction: pos.direction,
                    entry_price: pos.entry_price,
                    current_price: pos.current_price,
                    stop_loss: pos.stop_loss,
                    take_profit: pos.take_profit,
                    confidence: pos.confidence,
                    pnl_percent: pos.pnl_percent,
                    status: 'active',
                    market_phase: 'OKX',
                    entry_reason: 'OKX 포지션',
                    created_at: new Date().toISOString(),
                    position_usdt: pos.position_usdt,
                    unrealized_pnl: pos.unrealized_pnl,
                    source: 'okx',
                });
            }
        }
        
        return combined;
    }, [signals, okxPositions]);

    // 총계 계산 (통합)
    const totals = useMemo(() => {
        return allPositions.reduce((acc, s) => ({
            totalPositions: acc.totalPositions + (s.position_usdt || 0),
            totalUnrealizedPnl: acc.totalUnrealizedPnl + (s.unrealized_pnl || 0),
            profitable: acc.profitable + ((s.pnl_percent || 0) > 0 ? 1 : 0),
            losing: acc.losing + ((s.pnl_percent || 0) < 0 ? 1 : 0),
            quantBot: acc.quantBot + (s.source === 'quant_bot' || !s.source ? 1 : 0),
            okx: acc.okx + (s.source === 'okx' ? 1 : 0),
        }), { totalPositions: 0, totalUnrealizedPnl: 0, profitable: 0, losing: 0, quantBot: 0, okx: 0 });
    }, [allPositions]);

    // 필터링 및 정렬된 시그널 (통합)
    const sortedSignals = useMemo(() => {
        const filtered = allPositions.filter(signal =>
            signal.symbol.toLowerCase().includes(filterText.toLowerCase())
        );

        return filtered.sort((a, b) => {
            let aVal: number | string = 0;
            let bVal: number | string = 0;

            switch (sortField) {
                case "symbol":
                    aVal = a.symbol;
                    bVal = b.symbol;
                    break;
                case "direction":
                    aVal = a.direction;
                    bVal = b.direction;
                    break;
                case "entry_price":
                    aVal = a.entry_price;
                    bVal = b.entry_price;
                    break;
                case "current_price":
                    aVal = a.current_price;
                    bVal = b.current_price;
                    break;
                case "pnl_percent":
                    aVal = a.pnl_percent;
                    bVal = b.pnl_percent;
                    break;
                case "position_usdt":
                    aVal = a.position_usdt || 0;
                    bVal = b.position_usdt || 0;
                    break;
                case "unrealized_pnl":
                    aVal = a.unrealized_pnl || 0;
                    bVal = b.unrealized_pnl || 0;
                    break;
                case "confidence":
                    aVal = a.confidence;
                    bVal = b.confidence;
                    break;
                case "created_at":
                    aVal = new Date(a.created_at).getTime();
                    bVal = new Date(b.created_at).getTime();
                    break;
                case "source":
                    aVal = a.source || 'quant_bot';
                    bVal = b.source || 'quant_bot';
                    break;
                case "stop_loss":
                    aVal = a.stop_loss;
                    bVal = b.stop_loss;
                    break;
            }

            if (typeof aVal === "string" && typeof bVal === "string") {
                return sortOrder === "asc" 
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            return sortOrder === "asc" 
                ? (aVal as number) - (bVal as number)
                : (bVal as number) - (aVal as number);
        });
    }, [allPositions, filterText, sortField, sortOrder]);

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

    const formatUSD = (value: number) => {
        if (Math.abs(value) >= 1000) {
            return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        }
        return `$${value.toFixed(2)}`;
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col h-full">
            {/* Header with Summary Stats */}
            <div className="border-b border-slate-800">
                <div className="flex justify-between items-center px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-cyan-400" />
                            <h3 className="font-bold text-slate-100 text-lg">활성 포지션</h3>
                        </div>
                        {/* 시그널(가상) 포지션 */}
                        <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-full border border-cyan-500/30 flex items-center gap-1">
                            <Bot className="w-3 h-3" />
                            {totals.quantBot}개 시그널
                        </span>
                        {/* OKX 실거래 포지션 */}
                        {okxConnected && okxPositions.length > 0 && (
                            <span className="text-xs font-mono text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/30 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {okxPositions.length}개 실거래
                            </span>
                        )}
                        {/* 총합 */}
                        <span className="text-xs font-mono text-slate-400 bg-slate-700/50 px-2 py-1 rounded-full">
                            총 {sortedSignals.length}개
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* OKX 동기화 버튼 */}
                        {okxConnected && (
                            <button
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors",
                                    syncing 
                                        ? "bg-yellow-500/20 text-yellow-400" 
                                        : "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                                )}
                                onClick={handleSyncPositions}
                                disabled={syncing}
                                title="OKX 포지션 동기화"
                            >
                                <Zap className={cn("w-3 h-3", syncing && "animate-pulse")} />
                                {syncing ? "동기화중..." : "동기화"}
                            </button>
                        )}
                        <button
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                            onClick={() => setShowFilter(!showFilter)}
                            title="검색"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                        <button 
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                            onClick={fetchSignals}
                            title="새로고침"
                        >
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </button>
                    </div>
                </div>
                
                {/* Summary Stats Bar */}
                <div className="grid grid-cols-5 gap-2 px-4 pb-3">
                    <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">총 투자금</div>
                        <div className="text-sm font-bold text-slate-200">{formatUSD(totals.totalPositions)}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">미실현 손익</div>
                        <div className={cn(
                            "text-sm font-bold",
                            totals.totalUnrealizedPnl >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                            {totals.totalUnrealizedPnl >= 0 ? "+" : ""}{formatUSD(totals.totalUnrealizedPnl)}
                        </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">퀀트봇</div>
                        <div className="text-sm font-bold text-cyan-400 flex items-center justify-center gap-1">
                            <Bot className="w-3 h-3" />
                            {totals.quantBot}개
                        </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">OKX 실거래</div>
                        <div className={cn(
                            "text-sm font-bold flex items-center justify-center gap-1",
                            okxConnected ? "text-green-400" : "text-slate-600"
                        )}>
                            <DollarSign className="w-3 h-3" />
                            {okxPositions.length}개
                        </div>
                        {okxPositions.length > 0 && (
                            <div className={cn(
                                "text-[10px] mt-0.5",
                                okxPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0) >= 0 
                                    ? "text-green-400" 
                                    : "text-red-400"
                            )}>
                                {okxPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0) >= 0 ? "+" : ""}
                                ${okxPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0).toFixed(2)}
                            </div>
                        )}
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">수익/손실</div>
                        <div className="text-sm font-bold">
                            <span className="text-green-400">{totals.profitable}</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-red-400">{totals.losing}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter */}
            {showFilter && (
                <div className="px-4 py-2 border-b border-slate-800">
                    <input
                        type="text"
                        placeholder="심볼 검색... (BTC, ETH, ...)"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                    <thead className="bg-slate-800/70 sticky top-0">
                        <tr>
                            <th 
                                className="text-left px-3 py-2.5 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                                onClick={() => handleSort("symbol")}
                            >
                                <span className="flex items-center gap-1">
                                    <Target className="w-3 h-3" />
                                    심볼 <SortIcon field="symbol" />
                                </span>
                            </th>
                            <th 
                                className="text-center px-2 py-2.5 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                                onClick={() => handleSort("direction")}
                            >
                                <span className="flex items-center justify-center gap-1">방향 <SortIcon field="direction" /></span>
                            </th>
                            <th 
                                className="text-right px-2 py-2.5 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                                onClick={() => handleSort("position_usdt")}
                            >
                                <span className="flex items-center justify-end gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    포지션 <SortIcon field="position_usdt" />
                                </span>
                            </th>
                            <th 
                                className="text-right px-2 py-2.5 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                                onClick={() => handleSort("entry_price")}
                            >
                                <span className="flex items-center justify-end gap-1">진입가 <SortIcon field="entry_price" /></span>
                            </th>
                            <th 
                                className="text-right px-2 py-2.5 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                                onClick={() => handleSort("current_price")}
                            >
                                <span className="flex items-center justify-end gap-1">현재가 <SortIcon field="current_price" /></span>
                            </th>
                            <th 
                                className="text-right px-2 py-2.5 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                                onClick={() => handleSort("pnl_percent")}
                            >
                                <span className="flex items-center justify-end gap-1">
                                    <Percent className="w-3 h-3" />
                                    수익률 <SortIcon field="pnl_percent" />
                                </span>
                            </th>
                            <th 
                                className="text-right px-2 py-2.5 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                                onClick={() => handleSort("unrealized_pnl")}
                            >
                                <span className="flex items-center justify-end gap-1">
                                    미실현 손익 <SortIcon field="unrealized_pnl" />
                                </span>
                            </th>
                            <th 
                                className="text-right px-2 py-2.5 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                                onClick={() => handleSort("created_at")}
                            >
                                <span className="flex items-center justify-end gap-1">
                                    <Clock className="w-3 h-3" />
                                    보유 <SortIcon field="created_at" />
                                </span>
                            </th>
                            <th 
                                className="text-right px-2 py-2.5 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                                onClick={() => handleSort("stop_loss")}
                            >
                                <span className="flex items-center justify-end gap-1">SL/TP <SortIcon field="stop_loss" /></span>
                            </th>
                            <th 
                                className="text-center px-2 py-2.5 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                                onClick={() => handleSort("source")}
                            >
                                <span className="flex items-center justify-center gap-1">출처 <SortIcon field="source" /></span>
                            </th>
                            <th className="text-right px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">청산</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {loading && allPositions.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="text-center py-12 text-slate-500">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-cyan-400" />
                                    <div>포지션 데이터 로딩 중...</div>
                                </td>
                            </tr>
                        ) : sortedSignals.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="text-center py-12 text-slate-500">
                                    <Activity className="w-6 h-6 mx-auto mb-3 text-slate-600" />
                                    <div>보유중인 포지션이 없습니다</div>
                                    <div className="text-xs mt-1 text-slate-600">새 시그널 발생 시 자동으로 포지션이 생성됩니다</div>
                                </td>
                            </tr>
                        ) : (
                            sortedSignals.map((signal) => {
                                const isProfit = signal.pnl_percent > 0;
                                const isLoss = signal.pnl_percent < 0;
                                const pnlColor = isProfit ? "text-green-400" : isLoss ? "text-red-400" : "text-slate-400";
                                const unrealizedPnl = signal.unrealized_pnl || 0;
                                
                                return (
                                    <tr 
                                        key={signal.id} 
                                        className={cn(
                                            "hover:bg-slate-800/50 transition-colors",
                                            isProfit && "bg-green-500/5",
                                            isLoss && "bg-red-500/5"
                                        )}
                                    >
                                        <td className="px-3 py-2.5">
                                            <button 
                                                className="flex items-center gap-2 hover:text-cyan-400 transition-colors group"
                                                onClick={() => onSymbolClick?.(signal.symbol)}
                                                title="차트에서 보기"
                                            >
                                                <span className="font-bold text-slate-100 group-hover:text-cyan-400">
                                                    {signal.symbol}
                                                </span>
                                                {/* OKX 실거래 배지 */}
                                                {signal.source === 'okx' && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-green-500/30 text-green-300 border border-green-500/50 flex items-center gap-0.5">
                                                        <DollarSign className="w-2.5 h-2.5" />
                                                        실거래
                                                    </span>
                                                )}
                                                {signal.market_phase && signal.source !== 'okx' && (
                                                    <span className={cn(
                                                        "text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide",
                                                        signal.market_phase === "markup" && "bg-green-500/20 text-green-400",
                                                        signal.market_phase === "accumulation" && "bg-blue-500/20 text-blue-400",
                                                        signal.market_phase === "distribution" && "bg-amber-500/20 text-amber-400",
                                                        signal.market_phase === "markdown" && "bg-red-500/20 text-red-400",
                                                        !["markup", "accumulation", "distribution", "markdown"].includes(signal.market_phase) && "bg-slate-700 text-slate-400"
                                                    )}>
                                                        {signal.market_phase}
                                                    </span>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-2 py-2.5 text-center">
                                            <span className={cn(
                                                "inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-xs font-bold",
                                                signal.direction === "long" 
                                                    ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                                                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                                            )}>
                                                {signal.direction === "long" ? (
                                                    <><TrendingUp className="w-3 h-3" /> 롱</>
                                                ) : (
                                                    <><TrendingDown className="w-3 h-3" /> 숏</>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2.5 text-right">
                                            <div className="font-mono text-slate-200 font-medium">
                                                {formatUSD(signal.position_usdt || 0)}
                                            </div>
                                            <div className="text-[10px] text-slate-500">
                                                {(signal.position_size || 0).toFixed(2)} {signal.symbol}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2.5 text-right font-mono text-slate-400 text-xs">
                                            {formatPrice(signal.entry_price)}
                                        </td>
                                        <td className={cn(
                                            "px-2 py-2.5 text-right font-mono font-medium text-xs",
                                            pnlColor
                                        )}>
                                            {formatPrice(signal.current_price)}
                                        </td>
                                        <td className={cn(
                                            "px-2 py-2.5 text-right font-mono font-bold",
                                            pnlColor
                                        )}>
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded",
                                                isProfit && "bg-green-500/20",
                                                isLoss && "bg-red-500/20"
                                            )}>
                                                {isProfit ? "+" : ""}{signal.pnl_percent.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className={cn(
                                            "px-2 py-2.5 text-right font-mono font-bold text-xs",
                                            unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"
                                        )}>
                                            {unrealizedPnl >= 0 ? "+" : ""}{formatUSD(unrealizedPnl)}
                                        </td>
                                        <td className="px-2 py-2.5 text-right text-slate-500 text-xs">
                                            {formatDuration(signal.created_at)}
                                        </td>
                                        <td className="px-2 py-2.5 text-right text-xs">
                                            <div className="flex flex-col items-end gap-0.5">
                                                <span className="text-red-400 font-mono">{formatPrice(signal.stop_loss)}</span>
                                                <span className="text-green-400 font-mono">{formatPrice(signal.take_profit)}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2.5 text-center">
                                            {signal.source === 'okx' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/30 text-green-300 border border-green-500/50 shadow-sm shadow-green-500/20">
                                                    <DollarSign className="w-2.5 h-2.5" />
                                                    실거래
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                                    <Bot className="w-2.5 h-2.5" />
                                                    시그널
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <button 
                                                className={cn(
                                                    "inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md font-medium transition-all",
                                                    "bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/30",
                                                    closingId === signal.id && "opacity-50 cursor-not-allowed"
                                                )}
                                                onClick={() => handleClose(signal.id)}
                                                disabled={closingId === signal.id}
                                                title="포지션 청산"
                                            >
                                                {closingId === signal.id ? (
                                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <XCircle className="w-3 h-3" />
                                                )}
                                                청산
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Footer */}
            <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-500 flex justify-between items-center">
                <span>마지막 업데이트: 3초마다 자동 갱신</span>
                <span className="font-mono">
                    평균 수익률: {signals.length > 0 
                        ? (signals.reduce((a, s) => a + s.pnl_percent, 0) / signals.length).toFixed(2) 
                        : "0.00"}%
                </span>
            </div>
        </div>
    );
}
