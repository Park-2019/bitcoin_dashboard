"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api, Signal } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
    History, RefreshCw, Search, Filter, Download, Calendar,
    TrendingUp, TrendingDown, CheckCircle, XCircle, Clock,
    ChevronUp, ChevronDown, ChevronsUpDown, BarChart3
} from "lucide-react";

type SortField = "symbol" | "direction" | "pnl_percent" | "closed_at" | "status";
type SortOrder = "asc" | "desc";
type StatusFilter = "all" | "tp_hit" | "sl_hit" | "manual_close";

export default function HistoryPage() {
    const [history, setHistory] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [sortField, setSortField] = useState<SortField>("closed_at");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    // 거래내역 조회
    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await api.getHistory();
            if (response.success && response.data) {
                setHistory(response.data);
            }
        } catch (error) {
            console.error("History fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    // 통계 계산
    const stats = useMemo(() => {
        if (history.length === 0) return null;

        const tpHit = history.filter(h => h.status === "tp_hit");
        const slHit = history.filter(h => h.status === "sl_hit");
        const manualClose = history.filter(h => h.status === "manual_close");
        
        const totalPnl = history.reduce((sum, h) => sum + (h.final_pnl || h.pnl_percent || 0), 0);
        const avgPnl = totalPnl / history.length;
        const winRate = history.length > 0 ? (tpHit.length / history.length) * 100 : 0;
        
        const bestTrade = Math.max(...history.map(h => h.final_pnl || h.pnl_percent || 0));
        const worstTrade = Math.min(...history.map(h => h.final_pnl || h.pnl_percent || 0));

        return {
            total: history.length,
            tpHit: tpHit.length,
            slHit: slHit.length,
            manualClose: manualClose.length,
            totalPnl,
            avgPnl,
            winRate,
            bestTrade,
            worstTrade
        };
    }, [history]);

    // 정렬 및 필터링
    const filteredHistory = useMemo(() => {
        let filtered = history.filter(h => {
            const matchesText = h.symbol.toLowerCase().includes(filterText.toLowerCase());
            const matchesStatus = statusFilter === "all" || h.status === statusFilter;
            return matchesText && matchesStatus;
        });

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
                case "pnl_percent":
                    aVal = a.final_pnl || a.pnl_percent || 0;
                    bVal = b.final_pnl || b.pnl_percent || 0;
                    break;
                case "closed_at":
                    aVal = new Date(a.closed_at || a.created_at).getTime();
                    bVal = new Date(b.closed_at || b.created_at).getTime();
                    break;
                case "status":
                    aVal = a.status;
                    bVal = b.status;
                    break;
            }

            if (typeof aVal === "string" && typeof bVal === "string") {
                return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }

            return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });
    }, [history, filterText, statusFilter, sortField, sortOrder]);

    // 정렬 핸들러
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("desc");
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-slate-600" />;
        return sortOrder === "asc" ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "tp_hit":
                return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">익절</span>;
            case "sl_hit":
                return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">손절</span>;
            case "manual_close":
                return <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded-full">수동 청산</span>;
            default:
                return <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded-full">{status}</span>;
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleString("ko-KR", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // CSV 다운로드
    const downloadCSV = () => {
        const headers = ["심볼", "방향", "진입가", "종료가", "손익률", "상태", "시작일", "종료일"];
        const rows = filteredHistory.map(h => [
            h.symbol,
            h.direction,
            h.entry_price,
            h.current_price,
            `${(h.final_pnl || h.pnl_percent || 0).toFixed(2)}%`,
            h.status,
            h.created_at,
            h.closed_at || ""
        ]);

        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `trading_history_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    };

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* 페이지 헤더 */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                            <History className="w-7 h-7 text-cyan-400" />
                            거래내역
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">완료된 모든 거래의 기록을 확인합니다</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={downloadCSV}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            CSV 다운로드
                        </button>
                        <button
                            onClick={fetchHistory}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm flex items-center gap-2"
                        >
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                            새로고침
                        </button>
                    </div>
                </div>

                {/* 통계 카드 */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <div className="text-xs text-slate-500 mb-1">총 거래 수</div>
                            <div className="text-2xl font-bold text-slate-100">{stats.total}건</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <div className="text-xs text-slate-500 mb-1">승률</div>
                            <div className="text-2xl font-bold text-green-400">{stats.winRate.toFixed(1)}%</div>
                            <div className="text-xs text-slate-500 mt-1">익절 {stats.tpHit} / 손절 {stats.slHit}</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <div className="text-xs text-slate-500 mb-1">총 손익</div>
                            <div className={cn(
                                "text-2xl font-bold",
                                stats.totalPnl >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                                {stats.totalPnl >= 0 ? "+" : ""}{stats.totalPnl.toFixed(2)}%
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <div className="text-xs text-slate-500 mb-1">최고 수익</div>
                            <div className="text-2xl font-bold text-green-400">+{stats.bestTrade.toFixed(2)}%</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <div className="text-xs text-slate-500 mb-1">최대 손실</div>
                            <div className="text-2xl font-bold text-red-400">{stats.worstTrade.toFixed(2)}%</div>
                        </div>
                    </div>
                )}

                {/* 필터 */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="심볼 검색..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-500" />
                            <select
                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                            >
                                <option value="all">전체 상태</option>
                                <option value="tp_hit">익절</option>
                                <option value="sl_hit">손절</option>
                                <option value="manual_close">수동 청산</option>
                            </select>
                        </div>
                        <span className="text-sm text-slate-500">
                            {filteredHistory.length}건 표시
                        </span>
                    </div>
                </div>

                {/* 거래내역 테이블 */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800/70">
                                <tr>
                                    <th className="text-left px-4 py-3 text-slate-400 font-medium cursor-pointer hover:text-slate-200" onClick={() => handleSort("symbol")}>
                                        <span className="flex items-center gap-1">심볼 <SortIcon field="symbol" /></span>
                                    </th>
                                    <th className="text-center px-3 py-3 text-slate-400 font-medium cursor-pointer hover:text-slate-200" onClick={() => handleSort("direction")}>
                                        <span className="flex items-center justify-center gap-1">방향 <SortIcon field="direction" /></span>
                                    </th>
                                    <th className="text-right px-3 py-3 text-slate-400 font-medium">진입가</th>
                                    <th className="text-right px-3 py-3 text-slate-400 font-medium">종료가</th>
                                    <th className="text-right px-3 py-3 text-slate-400 font-medium cursor-pointer hover:text-slate-200" onClick={() => handleSort("pnl_percent")}>
                                        <span className="flex items-center justify-end gap-1">손익 <SortIcon field="pnl_percent" /></span>
                                    </th>
                                    <th className="text-center px-3 py-3 text-slate-400 font-medium cursor-pointer hover:text-slate-200" onClick={() => handleSort("status")}>
                                        <span className="flex items-center justify-center gap-1">상태 <SortIcon field="status" /></span>
                                    </th>
                                    <th className="text-right px-4 py-3 text-slate-400 font-medium cursor-pointer hover:text-slate-200" onClick={() => handleSort("closed_at")}>
                                        <span className="flex items-center justify-end gap-1">종료일 <SortIcon field="closed_at" /></span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-slate-500">
                                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
                                            로딩 중...
                                        </td>
                                    </tr>
                                ) : filteredHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-slate-500">
                                            <History className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                                            거래내역이 없습니다
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHistory.map((trade) => {
                                        const pnl = trade.final_pnl || trade.pnl_percent || 0;
                                        return (
                                            <tr key={trade.id} className="hover:bg-slate-800/30">
                                                <td className="px-4 py-3">
                                                    <span className="font-medium text-slate-200">{trade.symbol}</span>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold",
                                                        trade.direction === "long" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                                    )}>
                                                        {trade.direction === "long" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                        {trade.direction === "long" ? "롱" : "숏"}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-right font-mono text-slate-400 text-xs">
                                                    {trade.entry_price.toFixed(trade.entry_price >= 1 ? 4 : 6)}
                                                </td>
                                                <td className="px-3 py-3 text-right font-mono text-slate-200 text-xs">
                                                    {trade.current_price.toFixed(trade.current_price >= 1 ? 4 : 6)}
                                                </td>
                                                <td className={cn(
                                                    "px-3 py-3 text-right font-mono font-bold",
                                                    pnl >= 0 ? "text-green-400" : "text-red-400"
                                                )}>
                                                    {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    {getStatusBadge(trade.status)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-500 text-xs">
                                                    {formatDate(trade.closed_at || "")}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
