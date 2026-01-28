"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MainChart } from "@/components/dashboard/MainChart";
import { api, Position } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
    Wallet, RefreshCw, PieChart, TrendingUp, TrendingDown,
    DollarSign, BarChart3, ArrowUpRight, ArrowDownRight,
    Activity, Shield, Zap, CheckCircle, XCircle, AlertCircle,
    Settings, ExternalLink, LineChart
} from "lucide-react";

interface OKXPortfolio {
    connected: boolean;
    is_demo: boolean;
    auto_trade_enabled: boolean;
    can_trade: boolean;
    balance: {
        total: number;
        available: number;
        in_positions: number;
        spot_usdt: number;
        funding_usdt: number;
    };
    positions: {
        count: number;
        value: number;
        unrealized_pnl: number;
    };
    holdings: {
        count: number;
        total_value: number;
        details: Array<{
            currency: string;
            total: number;
            available: number;
            usd_value: number;
            frozen: number;
        }>;
    };
    trading_config: {
        leverage: number;
        position_size_percent: number;
        max_positions: number;
        min_confidence: number;
    };
}

interface BotStatus {
    bot_enabled: boolean;
    okx_connected: boolean;
    auto_trade_enabled: boolean;
    positions_count: number;
    okx_symbols_count: number;
}

export default function PortfolioPage() {
    const [portfolio, setPortfolio] = useState<OKXPortfolio | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
    const [loading, setLoading] = useState(true);
    
    // 차트 선택 심볼
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    
    // 설정 편집 상태
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [configForm, setConfigForm] = useState({
        leverage: 5,
        position_size_percent: 10,
        max_positions: 10,
        min_confidence: 70,
    });
    
    // editMode 상태를 ref로도 저장 (fetchData에서 사용)
    const editModeRef = useRef(editMode);
    useEffect(() => {
        editModeRef.current = editMode;
    }, [editMode]);

    const fetchData = useCallback(async () => {
        try {
            const [portfolioRes, positionsRes, botRes] = await Promise.all([
                api.getPortfolioStatus(),
                api.getPositions(),
                api.getBotStatus()
            ]);

            if (portfolioRes.success && portfolioRes.data) {
                setPortfolio(portfolioRes.data);
                // 설정 폼 초기화 (편집 모드가 아닐 때만)
                if (portfolioRes.data.trading_config && !editModeRef.current) {
                    setConfigForm({
                        leverage: portfolioRes.data.trading_config.leverage || 5,
                        position_size_percent: portfolioRes.data.trading_config.position_size_percent || 10,
                        max_positions: portfolioRes.data.trading_config.max_positions || 10,
                        min_confidence: portfolioRes.data.trading_config.min_confidence || 70,
                    });
                }
            }
            if (positionsRes.success && positionsRes.data) {
                setPositions(positionsRes.data);
            }
            if (botRes.success && botRes.data) {
                setBotStatus(botRes.data);
            }
        } catch (error) {
            console.error("Portfolio fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // 편집 모드가 아닐 때만 자동 새로고침
        if (!editMode) {
            const interval = setInterval(fetchData, 5000);
            return () => clearInterval(interval);
        }
    }, [fetchData, editMode]);

    // 설정 저장
    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            const res = await api.updateOKXConfig({
                leverage: configForm.leverage,
                max_position_pct: configForm.position_size_percent,
                max_positions: configForm.max_positions,
                min_confidence: configForm.min_confidence,
            });
            
            if (res.success) {
                setEditMode(false);
                await fetchData();
            } else {
                alert("설정 저장 실패: " + (res.error || "알 수 없는 오류"));
            }
        } catch (error) {
            console.error("Save config error:", error);
            alert("설정 저장 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    // 설정 취소
    const handleCancelEdit = () => {
        setEditMode(false);
        // 원래 값으로 복원
        if (portfolio?.trading_config) {
            setConfigForm({
                leverage: portfolio.trading_config.leverage || 5,
                position_size_percent: portfolio.trading_config.position_size_percent || 10,
                max_positions: portfolio.trading_config.max_positions || 10,
                min_confidence: portfolio.trading_config.min_confidence || 70,
            });
        }
    };

    // 포지션 통계 계산
    const positionStats = {
        totalValue: positions.reduce((sum, p) => sum + (p.margin * p.leverage), 0),
        totalPnl: positions.reduce((sum, p) => sum + p.pnl, 0),
        profitable: positions.filter(p => p.pnl > 0).length,
        losing: positions.filter(p => p.pnl < 0).length,
    };

    // 색상 팔레트
    const colors = [
        "bg-cyan-500", "bg-green-500", "bg-amber-500", "bg-purple-500", 
        "bg-pink-500", "bg-blue-500", "bg-red-500", "bg-orange-500"
    ];

    // OKX 미연결 상태
    if (!loading && (!portfolio || !portfolio.connected)) {
        return (
            <DashboardLayout>
                <div className="p-6">
                    <div className="max-w-2xl mx-auto mt-20">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
                            <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">OKX 연결이 필요합니다</h2>
                            <p className="text-slate-400 mb-6">
                                포트폴리오 페이지는 OKX 실거래 전용입니다.<br />
                                설정에서 OKX API를 연결하세요.
                            </p>
                            <a 
                                href="/settings" 
                                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                            >
                                <Settings className="w-5 h-5" />
                                설정으로 이동
                            </a>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* 페이지 헤더 */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                            <Wallet className="w-7 h-7 text-green-400" />
                            실거래 포트폴리오
                            <span className="text-sm font-normal px-2 py-1 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30">
                                OKX
                            </span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">OKX 실거래 자산 및 포지션 현황</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* 봇 상태 */}
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                            botStatus?.bot_enabled 
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-slate-700 text-slate-400"
                        )}>
                            <Zap className="w-4 h-4" />
                            봇 {botStatus?.bot_enabled ? "ON" : "OFF"}
                        </div>
                        <button
                            onClick={fetchData}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm flex items-center gap-2"
                        >
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                            새로고침
                        </button>
                    </div>
                </div>

                {/* 계정 상태 */}
                <div className="bg-gradient-to-r from-green-900/30 via-slate-900 to-green-900/30 border border-green-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                            <h3 className="text-lg font-semibold text-white">OKX 계정</h3>
                            <span className={cn(
                                "text-xs px-2 py-1 rounded font-bold",
                                portfolio?.is_demo 
                                    ? "bg-yellow-500/20 text-yellow-400" 
                                    : "bg-green-500/20 text-green-400"
                            )}>
                                {portfolio?.is_demo ? "데모" : "실거래"}
                            </span>
                        </div>
                        <div className={cn(
                            "flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg",
                            portfolio?.auto_trade_enabled && portfolio?.can_trade
                                ? "bg-green-500/20 text-green-400"
                                : portfolio?.auto_trade_enabled
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-slate-700 text-slate-400"
                        )}>
                            {portfolio?.auto_trade_enabled ? (
                                portfolio?.can_trade ? (
                                    <><CheckCircle className="w-4 h-4" /> 자동매매 가동 중</>
                                ) : (
                                    <><Zap className="w-4 h-4" /> 자동매매 대기</>
                                )
                            ) : (
                                <><XCircle className="w-4 h-4" /> 자동매매 비활성화</>
                            )}
                        </div>
                    </div>

                    {/* 자산 카드 */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
                            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> 총 자산
                            </div>
                            <div className="text-2xl font-bold text-white">
                                ${(portfolio?.balance?.total ?? 0).toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
                            <div className="text-xs text-slate-400 mb-1">가용 USDT</div>
                            <div className="text-2xl font-bold text-green-400">
                                ${(portfolio?.balance?.available ?? 0).toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
                            <div className="text-xs text-slate-400 mb-1">포지션 투자</div>
                            <div className="text-2xl font-bold text-blue-400">
                                ${(portfolio?.balance?.in_positions ?? 0).toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
                            <div className="text-xs text-slate-400 mb-1">미실현 손익</div>
                            <div className={cn(
                                "text-2xl font-bold",
                                positionStats.totalPnl >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                                {positionStats.totalPnl >= 0 ? "+" : ""}${positionStats.totalPnl.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
                            <div className="text-xs text-slate-400 mb-1">활성 포지션</div>
                            <div className="text-2xl font-bold text-amber-400">
                                {positions.length}개
                            </div>
                        </div>
                        <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
                            <div className="text-xs text-slate-400 mb-1">레버리지</div>
                            <div className="text-2xl font-bold text-purple-400">
                                {portfolio?.trading_config?.leverage ?? 1}x
                            </div>
                        </div>
                    </div>
                </div>

                {/* 차트 섹션 - 스크롤 시 상단 고정 */}
                {selectedSymbol && (
                    <div className="sticky top-0 z-40 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
                        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 backdrop-blur-sm">
                            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                <LineChart className="w-5 h-5 text-green-400" />
                                {selectedSymbol} 차트
                                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                                    고정됨
                                </span>
                            </h3>
                            <button
                                onClick={() => setSelectedSymbol(null)}
                                className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors flex items-center gap-1"
                            >
                                ✕ 닫기
                            </button>
                        </div>
                        <MainChart 
                            selectedSymbol={selectedSymbol} 
                            onSymbolChange={(symbol) => setSelectedSymbol(symbol)}
                        />
                    </div>
                )}

                {/* 포지션 & 통계 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 실거래 포지션 목록 */}
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-green-400" />
                                실거래 포지션
                                <span className="text-sm font-normal px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                                    {positions.length}개
                                </span>
                            </h3>
                            {positions.length > 0 && (
                                <div className={cn(
                                    "text-sm font-bold px-3 py-1 rounded",
                                    positionStats.totalPnl >= 0 
                                        ? "bg-green-500/20 text-green-400" 
                                        : "bg-red-500/20 text-red-400"
                                )}>
                                    {positionStats.totalPnl >= 0 ? "+" : ""}${positionStats.totalPnl.toFixed(2)}
                                </div>
                            )}
                        </div>
                        
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <RefreshCw className="w-8 h-8 animate-spin text-slate-600" />
                            </div>
                        ) : positions.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Activity className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                                <p className="text-lg">활성 포지션이 없습니다</p>
                                <p className="text-sm text-slate-600 mt-1">봇이 시그널을 감지하면 자동으로 진입합니다</p>
                                
                                {/* 빠른 차트 보기 */}
                                <div className="mt-6 pt-6 border-t border-slate-800">
                                    <p className="text-sm text-slate-500 mb-3">차트 빠른 보기</p>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {["BTC", "ETH", "SOL", "XRP", "DOGE", "AVAX"].map(symbol => (
                                            <button
                                                key={symbol}
                                                onClick={() => setSelectedSymbol(symbol)}
                                                className={cn(
                                                    "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                                                    selectedSymbol === symbol 
                                                        ? "bg-green-500/20 border-green-500/50 text-green-400"
                                                        : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                                                )}
                                            >
                                                <LineChart className="w-3 h-3 inline mr-1" />
                                                {symbol}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-800/50">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-slate-400 font-medium">심볼</th>
                                            <th className="text-center px-3 py-3 text-slate-400 font-medium">방향</th>
                                            <th className="text-center px-3 py-3 text-slate-400 font-medium">점수</th>
                                            <th className="text-right px-3 py-3 text-slate-400 font-medium">크기</th>
                                            <th className="text-right px-3 py-3 text-slate-400 font-medium">진입가</th>
                                            <th className="text-right px-3 py-3 text-slate-400 font-medium">현재가</th>
                                            <th className="text-right px-3 py-3 text-slate-400 font-medium">손익</th>
                                            <th className="text-right px-3 py-3 text-slate-400 font-medium">수익률</th>
                                            <th className="text-right px-4 py-3 text-slate-400 font-medium">청산가</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {positions.map((pos, idx) => {
                                            const isProfit = pos.pnl > 0;
                                            const symbol = pos.symbol.replace('-USDT-SWAP', '');
                                            
                                            return (
                                                <tr 
                                                    key={pos.symbol} 
                                                    className={cn(
                                                        "hover:bg-slate-800/50 transition-colors cursor-pointer",
                                                        isProfit ? "bg-green-500/5" : pos.pnl < 0 ? "bg-red-500/5" : "",
                                                        selectedSymbol === symbol && "ring-1 ring-green-500/50 bg-green-500/10"
                                                    )}
                                                    onClick={() => setSelectedSymbol(symbol)}
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("w-2 h-2 rounded-full", colors[idx % colors.length])} />
                                                            <span className="font-bold text-white hover:text-green-400 transition-colors">{symbol}</span>
                                                            <span className="text-xs text-slate-500">{pos.leverage}x</span>
                                                            <LineChart className="w-3 h-3 text-slate-600" />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold",
                                                            pos.side === "long" 
                                                                ? "bg-green-500/20 text-green-400" 
                                                                : "bg-red-500/20 text-red-400"
                                                        )}>
                                                            {pos.side === "long" ? (
                                                                <><TrendingUp className="w-3 h-3" /> 롱</>
                                                            ) : (
                                                                <><TrendingDown className="w-3 h-3" /> 숏</>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {pos.entry_score ? (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span className={cn(
                                                                    "inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold",
                                                                    pos.entry_score >= 80 
                                                                        ? "bg-green-500/20 text-green-400" 
                                                                        : pos.entry_score >= 60
                                                                        ? "bg-amber-500/20 text-amber-400"
                                                                        : pos.entry_score >= 40
                                                                        ? "bg-orange-500/20 text-orange-400"
                                                                        : "bg-red-500/20 text-red-400"
                                                                )}>
                                                                    {pos.entry_score}
                                                                </span>
                                                                {pos.market_phase && (
                                                                    <span className="text-[10px] text-slate-500 truncate max-w-[60px]">
                                                                        {pos.market_phase}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-600">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-mono text-slate-300">
                                                        {pos.size}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-mono text-slate-400 text-xs">
                                                        ${pos.entry_price.toFixed(4)}
                                                    </td>
                                                    <td className={cn(
                                                        "px-3 py-3 text-right font-mono text-xs",
                                                        isProfit ? "text-green-400" : pos.pnl < 0 ? "text-red-400" : "text-slate-400"
                                                    )}>
                                                        ${pos.mark_price.toFixed(4)}
                                                    </td>
                                                    <td className={cn(
                                                        "px-3 py-3 text-right font-mono font-bold",
                                                        isProfit ? "text-green-400" : pos.pnl < 0 ? "text-red-400" : "text-slate-400"
                                                    )}>
                                                        {isProfit ? "+" : ""}${pos.pnl.toFixed(2)}
                                                    </td>
                                                    <td className={cn(
                                                        "px-3 py-3 text-right font-mono font-bold",
                                                        isProfit ? "text-green-400" : pos.pnl < 0 ? "text-red-400" : "text-slate-400"
                                                    )}>
                                                        {isProfit ? "+" : ""}{pos.pnl_percent.toFixed(2)}%
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-amber-400 text-xs">
                                                        ${pos.liq_price?.toFixed(4) ?? "-"}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* 통계 사이드바 */}
                    <div className="space-y-6">
                        {/* 손익 분포 */}
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-green-400" />
                                손익 분포
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                                    <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-1" />
                                    <div className="text-2xl font-bold text-green-400">{positionStats.profitable}</div>
                                    <div className="text-xs text-green-400/70">수익</div>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                                    <TrendingDown className="w-6 h-6 text-red-400 mx-auto mb-1" />
                                    <div className="text-2xl font-bold text-red-400">{positionStats.losing}</div>
                                    <div className="text-xs text-red-400/70">손실</div>
                                </div>
                            </div>

                            {positions.length > 0 && (
                                <div className="h-4 rounded-full overflow-hidden flex bg-slate-700">
                                    <div 
                                        className="bg-green-500 h-full"
                                        style={{ width: `${(positionStats.profitable / positions.length) * 100}%` }}
                                    />
                                    <div 
                                        className="bg-red-500 h-full"
                                        style={{ width: `${(positionStats.losing / positions.length) * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* 포지션 분배 */}
                        {positions.length > 0 && (
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                                    <PieChart className="w-5 h-5 text-green-400" />
                                    포지션 분배
                                </h3>
                                
                                {/* 시각적 바 */}
                                <div className="h-6 rounded-lg overflow-hidden flex mb-4">
                                    {positions.map((pos, idx) => {
                                        const percentage = positionStats.totalValue > 0 
                                            ? ((pos.margin * pos.leverage) / positionStats.totalValue) * 100 
                                            : 0;
                                        return (
                                            <div
                                                key={pos.symbol}
                                                className={cn(colors[idx % colors.length], "h-full")}
                                                style={{ width: `${percentage}%` }}
                                                title={`${pos.symbol}: ${percentage.toFixed(1)}%`}
                                            />
                                        );
                                    })}
                                </div>

                                {/* 범례 */}
                                <div className="space-y-2">
                                    {positions.map((pos, idx) => {
                                        const value = pos.margin * pos.leverage;
                                        const percentage = positionStats.totalValue > 0 
                                            ? (value / positionStats.totalValue) * 100 
                                            : 0;
                                        const symbol = pos.symbol.replace('-USDT-SWAP', '');
                                        
                                        return (
                                            <div key={pos.symbol} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-3 h-3 rounded", colors[idx % colors.length])} />
                                                    <span className="text-slate-300">{symbol}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-500">${value.toFixed(0)}</span>
                                                    <span className="font-mono text-slate-200">{percentage.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 현물 보유 자산 */}
                        {portfolio?.holdings && portfolio.holdings.count > 0 && (
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-green-400" />
                                    현물 보유
                                    <span className="text-xs text-slate-500">${portfolio.holdings.total_value?.toFixed(2)}</span>
                                </h3>
                                
                                <div className="space-y-2">
                                    {portfolio.holdings.details?.map(asset => (
                                        <div key={asset.currency} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                                            <span className="font-medium text-white">{asset.currency}</span>
                                            <div className="text-right">
                                                <div className="text-sm text-slate-300">{asset.total?.toFixed(4)}</div>
                                                <div className="text-xs text-slate-500">${asset.usd_value?.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 거래 설정 */}
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-green-400" />
                                    거래 설정
                                </h3>
                                {!editMode && (
                                    <button
                                        onClick={() => setEditMode(true)}
                                        className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                                    >
                                        편집
                                    </button>
                                )}
                            </div>
                            
                            <div className="space-y-3">
                                {/* 레버리지 */}
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">레버리지</span>
                                    {editMode ? (
                                        <select
                                            value={configForm.leverage}
                                            onChange={(e) => setConfigForm({...configForm, leverage: Number(e.target.value)})}
                                            className="bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-sm w-20"
                                        >
                                            {[1, 2, 3, 5, 10, 20, 50, 100].map(v => (
                                                <option key={v} value={v}>{v}x</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className="font-bold text-purple-400">{portfolio?.trading_config?.leverage ?? 1}x</span>
                                    )}
                                </div>
                                
                                {/* 포지션 비율 */}
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">포지션 비율</span>
                                    {editMode ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={configForm.position_size_percent}
                                                onChange={(e) => setConfigForm({...configForm, position_size_percent: Number(e.target.value)})}
                                                className="bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-sm w-16 text-right"
                                            />
                                            <span className="text-slate-400">%</span>
                                        </div>
                                    ) : (
                                        <span className="font-bold text-cyan-400">{portfolio?.trading_config?.position_size_percent ?? 10}%</span>
                                    )}
                                </div>
                                
                                {/* 최대 포지션 */}
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">최대 포지션</span>
                                    {editMode ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={configForm.max_positions}
                                                onChange={(e) => setConfigForm({...configForm, max_positions: Number(e.target.value)})}
                                                className="bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-sm w-16 text-right"
                                            />
                                            <span className="text-slate-400">개</span>
                                        </div>
                                    ) : (
                                        <span className="font-bold text-amber-400">{portfolio?.trading_config?.max_positions ?? 10}개</span>
                                    )}
                                </div>
                                
                                {/* 최소 신뢰도 */}
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">최소 신뢰도</span>
                                    {editMode ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="50"
                                                max="100"
                                                value={configForm.min_confidence}
                                                onChange={(e) => setConfigForm({...configForm, min_confidence: Number(e.target.value)})}
                                                className="bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-sm w-16 text-right"
                                            />
                                            <span className="text-slate-400">%</span>
                                        </div>
                                    ) : (
                                        <span className="font-bold text-green-400">{portfolio?.trading_config?.min_confidence ?? 70}%</span>
                                    )}
                                </div>
                                
                                {/* 지원 심볼 (읽기 전용) */}
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">지원 심볼</span>
                                    <span className="font-bold text-blue-400">{botStatus?.okx_symbols_count ?? 0}개</span>
                                </div>
                            </div>
                            
                            {editMode ? (
                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={handleSaveConfig}
                                        disabled={saving}
                                        className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {saving ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                저장 중...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4" />
                                                저장
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={saving}
                                        className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        취소
                                    </button>
                                </div>
                            ) : (
                                <a 
                                    href="/settings" 
                                    className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    전체 설정
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
