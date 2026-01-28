"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api, AnalysisResult, Signal } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
    TrendingUp, TrendingDown, Target, Zap, AlertTriangle,
    Search, RefreshCw, Plus, X, Activity, DollarSign,
    ArrowUpCircle, ArrowDownCircle, Clock, Percent, Shield
} from "lucide-react";

// 인기 심볼 목록
const popularSymbols = [
    "BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "DOT", "LINK", "UNI"
];

export default function TradingPage() {
    const [searchSymbol, setSearchSymbol] = useState("");
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // 분석 실행
    const runAnalysis = useCallback(async (symbol: string) => {
        setLoading(true);
        setSelectedSymbol(symbol.toUpperCase());
        setMessage(null);
        
        try {
            const response = await api.analyze(symbol.toUpperCase());
            if (response.success && response.data) {
                setAnalysis(response.data);
            } else {
                setMessage({ type: "error", text: "분석 실패: 데이터를 가져올 수 없습니다." });
            }
        } catch (error) {
            setMessage({ type: "error", text: "분석 중 오류가 발생했습니다." });
        } finally {
            setLoading(false);
        }
    }, []);

    // 시그널 생성 (포지션 진입)
    const createSignal = async (direction: "long" | "short") => {
        if (!analysis || !selectedSymbol) return;
        
        setCreating(true);
        try {
            const response = await api.createSignal({
                symbol: selectedSymbol,
                direction,
                entry_price: analysis.current_price,
                confidence: analysis.entry_score
            });
            
            if (response.success) {
                setMessage({ type: "success", text: `${selectedSymbol} ${direction === "long" ? "롱" : "숏"} 포지션이 생성되었습니다!` });
                fetchRecentSignals();
            } else {
                setMessage({ type: "error", text: "포지션 생성 실패" });
            }
        } catch (error) {
            setMessage({ type: "error", text: "포지션 생성 중 오류가 발생했습니다." });
        } finally {
            setCreating(false);
        }
    };

    // 최근 시그널 조회
    const fetchRecentSignals = async () => {
        try {
            const response = await api.getSignals();
            if (response.success && response.data) {
                setRecentSignals(response.data.slice(0, 5));
            }
        } catch (error) {
            console.error("Recent signals fetch error:", error);
        }
    };

    useEffect(() => {
        fetchRecentSignals();
        const interval = setInterval(fetchRecentSignals, 5000);
        return () => clearInterval(interval);
    }, []);

    // 검색 제출
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchSymbol.trim()) {
            runAnalysis(searchSymbol.trim());
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* 페이지 헤더 */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">수동 트레이딩</h1>
                        <p className="text-sm text-slate-400 mt-1">심볼을 분석하고 수동으로 포지션을 생성합니다</p>
                    </div>
                </div>

                {/* 메시지 표시 */}
                {message && (
                    <div className={cn(
                        "p-4 rounded-lg flex items-center gap-3",
                        message.type === "success" ? "bg-green-500/20 border border-green-500/30" : "bg-red-500/20 border border-red-500/30"
                    )}>
                        {message.type === "success" ? (
                            <Activity className="w-5 h-5 text-green-400" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        )}
                        <span className={message.type === "success" ? "text-green-400" : "text-red-400"}>
                            {message.text}
                        </span>
                        <button 
                            onClick={() => setMessage(null)}
                            className="ml-auto text-slate-400 hover:text-slate-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 왼쪽: 심볼 검색 및 인기 심볼 */}
                    <div className="space-y-4">
                        {/* 검색 */}
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-slate-300 mb-3">심볼 검색</h3>
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="BTC, ETH, SOL..."
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                        value={searchSymbol}
                                        onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !searchSymbol.trim()}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                    분석
                                </button>
                            </form>
                        </div>

                        {/* 인기 심볼 */}
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-slate-300 mb-3">인기 심볼</h3>
                            <div className="flex flex-wrap gap-2">
                                {popularSymbols.map((symbol) => (
                                    <button
                                        key={symbol}
                                        onClick={() => runAnalysis(symbol)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                            selectedSymbol === symbol
                                                ? "bg-cyan-500 text-white"
                                                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                        )}
                                    >
                                        {symbol}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 최근 생성된 포지션 */}
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-slate-300 mb-3">최근 포지션</h3>
                            <div className="space-y-2">
                                {recentSignals.length === 0 ? (
                                    <p className="text-xs text-slate-500 text-center py-4">최근 포지션이 없습니다</p>
                                ) : (
                                    recentSignals.map((signal) => (
                                        <div 
                                            key={signal.id}
                                            className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-xs font-bold px-1.5 py-0.5 rounded",
                                                    signal.direction === "long" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                                )}>
                                                    {signal.direction === "long" ? "롱" : "숏"}
                                                </span>
                                                <span className="text-sm font-medium text-slate-200">{signal.symbol}</span>
                                            </div>
                                            <span className={cn(
                                                "text-xs font-mono",
                                                signal.pnl_percent >= 0 ? "text-green-400" : "text-red-400"
                                            )}>
                                                {signal.pnl_percent >= 0 ? "+" : ""}{signal.pnl_percent.toFixed(2)}%
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 중앙: 분석 결과 */}
                    <div className="lg:col-span-2">
                        {!selectedSymbol ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
                                <Target className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-400 mb-2">심볼을 선택하세요</h3>
                                <p className="text-sm text-slate-500">왼쪽에서 심볼을 검색하거나 인기 심볼을 클릭하세요</p>
                            </div>
                        ) : loading ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
                                <RefreshCw className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-spin" />
                                <h3 className="text-lg font-medium text-slate-300 mb-2">{selectedSymbol} 분석 중...</h3>
                                <p className="text-sm text-slate-500">기술적 분석과 시장 데이터를 수집하고 있습니다</p>
                            </div>
                        ) : analysis ? (
                            <div className="space-y-4">
                                {/* 심볼 헤더 */}
                                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <h2 className="text-2xl font-bold text-slate-100">{analysis.symbol}/USDT</h2>
                                                <p className="text-slate-400 text-sm">현재가: ${analysis.current_price.toLocaleString()}</p>
                                            </div>
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-sm font-medium uppercase",
                                                analysis.market_phase === "markup" && "bg-green-500/20 text-green-400",
                                                analysis.market_phase === "accumulation" && "bg-blue-500/20 text-blue-400",
                                                analysis.market_phase === "distribution" && "bg-amber-500/20 text-amber-400",
                                                analysis.market_phase === "markdown" && "bg-red-500/20 text-red-400"
                                            )}>
                                                {analysis.market_phase}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-slate-400">진입 적합도</div>
                                            <div className={cn(
                                                "text-3xl font-bold",
                                                analysis.entry_score >= 80 ? "text-green-400" :
                                                analysis.entry_score >= 60 ? "text-amber-400" : "text-red-400"
                                            )}>
                                                {analysis.entry_score}%
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 기술적 지표 */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                                        <div className="text-xs text-slate-500 mb-1">RSI</div>
                                        <div className={cn(
                                            "text-xl font-bold",
                                            analysis.technical.rsi < 30 ? "text-green-400" :
                                            analysis.technical.rsi > 70 ? "text-red-400" : "text-slate-200"
                                        )}>
                                            {analysis.technical.rsi.toFixed(1)}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                                        <div className="text-xs text-slate-500 mb-1">MACD</div>
                                        <div className={cn(
                                            "text-xl font-bold",
                                            analysis.technical.macd_signal === "bullish" ? "text-green-400" : "text-red-400"
                                        )}>
                                            {analysis.technical.macd_signal === "bullish" ? "매수" : "매도"}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                                        <div className="text-xs text-slate-500 mb-1">BB 위치</div>
                                        <div className="text-xl font-bold text-slate-200">
                                            {analysis.technical.bb_position}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                                        <div className="text-xs text-slate-500 mb-1">ATR</div>
                                        <div className="text-xl font-bold text-slate-200">
                                            {analysis.technical.atr.toFixed(4)}
                                        </div>
                                    </div>
                                </div>

                                {/* 트레이딩 액션 */}
                                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                                    <h3 className="text-sm font-medium text-slate-300 mb-4">포지션 생성</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => createSignal("long")}
                                            disabled={creating || analysis.entry_score < 50}
                                            className={cn(
                                                "flex items-center justify-center gap-3 p-4 rounded-lg font-bold text-lg transition-all",
                                                analysis.entry_score >= 50
                                                    ? "bg-green-600 hover:bg-green-500 text-white"
                                                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                                            )}
                                        >
                                            {creating ? (
                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <ArrowUpCircle className="w-6 h-6" />
                                            )}
                                            롱 진입
                                        </button>
                                        <button
                                            onClick={() => createSignal("short")}
                                            disabled={creating || analysis.entry_score < 50}
                                            className={cn(
                                                "flex items-center justify-center gap-3 p-4 rounded-lg font-bold text-lg transition-all",
                                                analysis.entry_score >= 50
                                                    ? "bg-red-600 hover:bg-red-500 text-white"
                                                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                                            )}
                                        >
                                            {creating ? (
                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <ArrowDownCircle className="w-6 h-6" />
                                            )}
                                            숏 진입
                                        </button>
                                    </div>
                                    {analysis.entry_score < 50 && (
                                        <p className="text-xs text-amber-400 mt-3 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            진입 적합도가 50% 미만입니다. 더 좋은 기회를 기다리세요.
                                        </p>
                                    )}
                                </div>

                                {/* 추가 정보 */}
                                {analysis.volume && (
                                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-slate-300 mb-3">볼륨 분석</h3>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">볼륨 비율</div>
                                                <div className="text-lg font-bold text-slate-200">
                                                    {analysis.volume.volume_ratio?.toFixed(2) || "N/A"}x
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">매수 압력</div>
                                                <div className="text-lg font-bold text-green-400">
                                                    {analysis.volume.buy_pressure?.toFixed(0) || "N/A"}%
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">볼륨 점수</div>
                                                <div className="text-lg font-bold text-slate-200">
                                                    {analysis.volume.overall_score?.toFixed(0) || "N/A"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
                                <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-400 mb-2">분석 데이터 없음</h3>
                                <p className="text-sm text-slate-500">다시 시도해주세요</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
