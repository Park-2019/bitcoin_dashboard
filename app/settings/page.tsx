"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api, OKXConfig, NotifyConfig, OKXFullStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
    Settings, Save, RefreshCw, Key, Bell, Sliders, Shield,
    Zap, AlertTriangle, CheckCircle, Eye, EyeOff, Trash2,
    RotateCcw, Server, Wallet, Target, Clock, Percent,
    Power, Play, Pause, TrendingUp, DollarSign, Activity
} from "lucide-react";

type TabType = "exchange" | "strategy" | "notifications" | "system";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabType>("exchange");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // OKX 실거래 상태
    const [okxStatus, setOkxStatus] = useState<OKXFullStatus | null>(null);

    // OKX 설정
    const [okxConfig, setOkxConfig] = useState<OKXConfig>({
        enabled: false,
        api_key: "",
        secret_key: "",
        passphrase: "",
        demo_mode: true,
        leverage: 1,
        max_position_pct: 10,
        auto_trade: false
    });
    const [showSecrets, setShowSecrets] = useState(false);

    // OKX 상태 조회
    const fetchOKXStatus = useCallback(async () => {
        try {
            const res = await api.getOKXFullStatus();
            if (res.success && res.data) {
                setOkxStatus(res.data);
            }
        } catch (error) {
            console.error("OKX status fetch error:", error);
        }
    }, []);

    // OKX 연결
    const connectOKX = async () => {
        setConnecting(true);
        setMessage(null);
        try {
            const res = await api.connectOKX();
            if (res.success) {
                setMessage({ type: "success", text: res.message || "OKX 연결 성공!" });
                await fetchOKXStatus();
            } else {
                setMessage({ type: "error", text: res.error || "연결 실패" });
            }
        } catch (error) {
            setMessage({ type: "error", text: "연결 중 오류가 발생했습니다." });
        } finally {
            setConnecting(false);
        }
    };

    // 자동 매매 토글
    const toggleAutoTrade = async () => {
        const newEnabled = !okxStatus?.auto_trade_enabled;
        try {
            const res = await api.enableAutoTrade(newEnabled);
            if (res.success) {
                setMessage({ type: "success", text: res.message });
                await fetchOKXStatus();
            } else {
                setMessage({ type: "error", text: res.error || "변경 실패" });
            }
        } catch (error) {
            setMessage({ type: "error", text: "변경 중 오류가 발생했습니다." });
        }
    };

    // 알림 설정
    const [notifyConfig, setNotifyConfig] = useState<NotifyConfig>({
        telegram_enabled: false,
        telegram_token: "",
        telegram_chat_id: "",
        discord_enabled: false,
        discord_webhook: "",
        notify_on_signal: true,
        notify_on_trade: true,
        notify_on_error: true
    });

    // 전략 설정
    const [strategyConfig, setStrategyConfig] = useState({
        min_confidence: 70,
        max_positions: 100,
        position_size_pct: 1,
        stop_loss_atr_mult: 1.5,
        take_profit_rr: 2.0,
        scan_interval: 5,
        price_update_interval: 3
    });

    // 시스템 설정
    const [systemConfig, setSystemConfig] = useState({
        auto_scan_enabled: true,
        auto_price_update: true,
        log_level: "INFO",
        max_log_entries: 1000,
        data_retention_days: 30
    });

    // 설정 로드
    const loadSettings = async () => {
        setLoading(true);
        try {
            const [okxRes, notifyRes, okxStatusRes] = await Promise.all([
                api.getOKXConfig(),
                api.getNotifyConfig(),
                api.getOKXFullStatus()
            ]);

            if (okxRes.success && okxRes.data) {
                // 마스킹된 값(****포함)은 빈 값으로 처리
                const cleanedData = { ...okxRes.data };
                if (cleanedData.api_key && cleanedData.api_key.includes("****")) {
                    cleanedData.api_key = "";
                }
                setOkxConfig(prev => ({ ...prev, ...cleanedData }));
            }
            if (notifyRes.success && notifyRes.data) {
                setNotifyConfig(prev => ({ ...prev, ...notifyRes.data }));
            }
            if (okxStatusRes.success && okxStatusRes.data) {
                setOkxStatus(okxStatusRes.data);
            }
        } catch (error) {
            console.error("Settings load error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
        
        // OKX 상태 주기적 업데이트
        const interval = setInterval(fetchOKXStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchOKXStatus]);

    // 설정 저장
    const saveSettings = async () => {
        setSaving(true);
        setMessage(null);

        try {
            let success = true;

            if (activeTab === "exchange") {
                const res = await api.updateOKXConfig(okxConfig);
                success = res.success;
            } else if (activeTab === "notifications") {
                const res = await api.updateNotifyConfig(notifyConfig);
                success = res.success;
            }

            if (success) {
                setMessage({ type: "success", text: "설정이 저장되었습니다." });
            } else {
                setMessage({ type: "error", text: "설정 저장에 실패했습니다." });
            }
        } catch (error) {
            setMessage({ type: "error", text: "저장 중 오류가 발생했습니다." });
        } finally {
            setSaving(false);
        }
    };

    // 지갑 리셋
    const resetWallet = async () => {
        if (!confirm("가상 지갑을 초기화하시겠습니까? 모든 포지션이 청산되고 잔고가 $10,000로 초기화됩니다.")) {
            return;
        }

        try {
            const res = await api.resetWallet();
            if (res.success) {
                setMessage({ type: "success", text: "지갑이 초기화되었습니다." });
            } else {
                setMessage({ type: "error", text: "지갑 초기화에 실패했습니다." });
            }
        } catch (error) {
            setMessage({ type: "error", text: "초기화 중 오류가 발생했습니다." });
        }
    };

    const tabs = [
        { id: "exchange" as TabType, label: "거래소 연동", icon: Zap },
        { id: "strategy" as TabType, label: "전략 설정", icon: Target },
        { id: "notifications" as TabType, label: "알림 설정", icon: Bell },
        { id: "system" as TabType, label: "시스템", icon: Server },
    ];

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* 페이지 헤더 */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                            <Settings className="w-7 h-7 text-cyan-400" />
                            설정
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">시스템 및 거래 설정을 관리합니다</p>
                    </div>
                    <button
                        onClick={saveSettings}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        저장
                    </button>
                </div>

                {/* 메시지 */}
                {message && (
                    <div className={cn(
                        "p-4 rounded-lg flex items-center gap-3",
                        message.type === "success" ? "bg-green-500/20 border border-green-500/30" : "bg-red-500/20 border border-red-500/30"
                    )}>
                        {message.type === "success" ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        )}
                        <span className={message.type === "success" ? "text-green-400" : "text-red-400"}>
                            {message.text}
                        </span>
                    </div>
                )}

                {/* 탭 */}
                <div className="flex gap-2 border-b border-slate-800 pb-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors",
                                activeTab === tab.id
                                    ? "bg-cyan-600 text-white"
                                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                    </div>
                ) : (
                    <>
                        {/* 거래소 연동 */}
                        {activeTab === "exchange" && (
                            <div className="space-y-6">
                                {/* OKX 실거래 상태 패널 */}
                                <div className={cn(
                                    "border rounded-lg p-6",
                                    okxStatus?.connected 
                                        ? "bg-gradient-to-r from-green-900/30 to-slate-900 border-green-700/50"
                                        : "bg-slate-900 border-slate-800"
                                )}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                            <Power className={cn("w-5 h-5", okxStatus?.connected ? "text-green-400" : "text-slate-500")} />
                                            OKX 실거래 상태
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-sm font-medium",
                                                okxStatus?.connected 
                                                    ? "bg-green-500/20 text-green-400"
                                                    : "bg-slate-700 text-slate-400"
                                            )}>
                                                {okxStatus?.connected ? "연결됨" : "연결 안됨"}
                                            </span>
                                            {okxStatus?.is_demo && okxStatus?.connected && (
                                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-500/20 text-amber-400">
                                                    데모 모드
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {okxStatus?.connected ? (
                                        <div className="space-y-4">
                                            {/* 잔고 정보 */}
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="bg-slate-800/50 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                                                        <DollarSign className="w-4 h-4" />
                                                        총 자산
                                                    </div>
                                                    <div className="text-2xl font-bold text-white">
                                                        ${okxStatus.balance?.total_usdt?.toFixed(2) || "0.00"}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-800/50 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                                                        <Wallet className="w-4 h-4" />
                                                        가용 잔고
                                                    </div>
                                                    <div className="text-2xl font-bold text-cyan-400">
                                                        ${okxStatus.balance?.free_usdt?.toFixed(2) || "0.00"}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-800/50 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                                                        <Activity className="w-4 h-4" />
                                                        포지션
                                                    </div>
                                                    <div className="text-2xl font-bold text-slate-200">
                                                        {okxStatus.stats?.positions_count || 0}개
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 자동 매매 컨트롤 */}
                                            <div className="bg-slate-800/50 rounded-lg p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                                            {okxStatus.auto_trade_enabled ? (
                                                                <Play className="w-4 h-4 text-green-400" />
                                                            ) : (
                                                                <Pause className="w-4 h-4 text-slate-500" />
                                                            )}
                                                            자동 매매
                                                        </h4>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            시그널 발생 시 자동으로 OKX에 주문을 실행합니다
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={toggleAutoTrade}
                                                        className={cn(
                                                            "px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors",
                                                            okxStatus.auto_trade_enabled
                                                                ? "bg-red-600 hover:bg-red-500 text-white"
                                                                : "bg-green-600 hover:bg-green-500 text-white"
                                                        )}
                                                    >
                                                        {okxStatus.auto_trade_enabled ? (
                                                            <>
                                                                <Pause className="w-4 h-4" />
                                                                비활성화
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Play className="w-4 h-4" />
                                                                활성화
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                {okxStatus.auto_trade_enabled && (
                                                    <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                                        <p className="text-sm text-green-400 flex items-center gap-2">
                                                            <TrendingUp className="w-4 h-4" />
                                                            자동 매매가 활성화되었습니다. 시그널 발생 시 실제 OKX 주문이 실행됩니다!
                                                        </p>
                                                        <div className="mt-2 text-xs text-green-400/70">
                                                            • 포지션 크기: 잔고의 {okxStatus.config?.position_size_percent || 2}%
                                                            • 레버리지: {okxStatus.config?.leverage || 5}x
                                                            • 최대 포지션: {okxStatus.config?.max_positions || 10}개
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 거래 통계 */}
                                            <div className="grid grid-cols-4 gap-3 text-center">
                                                <div className="bg-slate-800/50 rounded-lg p-3">
                                                    <div className="text-xs text-slate-500">오늘 거래</div>
                                                    <div className="text-lg font-bold text-slate-200">{okxStatus.stats?.daily_trades || 0}</div>
                                                </div>
                                                <div className="bg-slate-800/50 rounded-lg p-3">
                                                    <div className="text-xs text-slate-500">오늘 손익</div>
                                                    <div className={cn(
                                                        "text-lg font-bold",
                                                        (okxStatus.stats?.daily_pnl || 0) >= 0 ? "text-green-400" : "text-red-400"
                                                    )}>
                                                        {(okxStatus.stats?.daily_pnl || 0) >= 0 ? "+" : ""}${(okxStatus.stats?.daily_pnl || 0).toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-800/50 rounded-lg p-3">
                                                    <div className="text-xs text-slate-500">미실현</div>
                                                    <div className={cn(
                                                        "text-lg font-bold",
                                                        (okxStatus.stats?.unrealized_pnl || 0) >= 0 ? "text-green-400" : "text-red-400"
                                                    )}>
                                                        {(okxStatus.stats?.unrealized_pnl || 0) >= 0 ? "+" : ""}${(okxStatus.stats?.unrealized_pnl || 0).toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-800/50 rounded-lg p-3">
                                                    <div className="text-xs text-slate-500">총 거래</div>
                                                    <div className="text-lg font-bold text-slate-200">{okxStatus.stats?.total_trades || 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6">
                                            <p className="text-slate-400 mb-4">OKX에 연결되지 않았습니다. API 키를 입력하고 연결하세요.</p>
                                            <button
                                                onClick={connectOKX}
                                                disabled={connecting || !okxConfig.api_key}
                                                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium flex items-center gap-2 mx-auto disabled:opacity-50"
                                            >
                                                {connecting ? (
                                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Power className="w-5 h-5" />
                                                )}
                                                OKX 연결
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                                        <Key className="w-5 h-5 text-cyan-400" />
                                        OKX API 설정
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-slate-300">OKX 연동 활성화</label>
                                            <button
                                                onClick={() => setOkxConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                                                className={cn(
                                                    "w-12 h-6 rounded-full transition-colors relative",
                                                    okxConfig.enabled ? "bg-green-500" : "bg-slate-700"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                                                    okxConfig.enabled ? "translate-x-6" : "translate-x-0.5"
                                                )} />
                                            </button>
                                        </div>

                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">API Key</label>
                                            <input
                                                type={showSecrets ? "text" : "password"}
                                                value={okxConfig.api_key}
                                                onChange={(e) => setOkxConfig(prev => ({ ...prev, api_key: e.target.value }))}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                                placeholder="API Key를 입력하세요"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Secret Key</label>
                                            <input
                                                type={showSecrets ? "text" : "password"}
                                                value={okxConfig.secret_key}
                                                onChange={(e) => setOkxConfig(prev => ({ ...prev, secret_key: e.target.value }))}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                                placeholder="Secret Key를 입력하세요"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Passphrase</label>
                                            <input
                                                type={showSecrets ? "text" : "password"}
                                                value={okxConfig.passphrase}
                                                onChange={(e) => setOkxConfig(prev => ({ ...prev, passphrase: e.target.value }))}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                                placeholder="Passphrase를 입력하세요"
                                            />
                                        </div>

                                        <button
                                            onClick={() => setShowSecrets(!showSecrets)}
                                            className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
                                        >
                                            {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            {showSecrets ? "숨기기" : "보이기"}
                                        </button>

                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm text-slate-300">데모 모드</label>
                                                <button
                                                    onClick={() => setOkxConfig(prev => ({ ...prev, demo_mode: !prev.demo_mode }))}
                                                    className={cn(
                                                        "w-12 h-6 rounded-full transition-colors relative",
                                                        okxConfig.demo_mode ? "bg-green-500" : "bg-slate-700"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                                                        okxConfig.demo_mode ? "translate-x-6" : "translate-x-0.5"
                                                    )} />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm text-slate-300">자동 거래</label>
                                                <button
                                                    onClick={() => setOkxConfig(prev => ({ ...prev, auto_trade: !prev.auto_trade }))}
                                                    className={cn(
                                                        "w-12 h-6 rounded-full transition-colors relative",
                                                        okxConfig.auto_trade ? "bg-green-500" : "bg-slate-700"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                                                        okxConfig.auto_trade ? "translate-x-6" : "translate-x-0.5"
                                                    )} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">레버리지</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={100}
                                                    value={okxConfig.leverage}
                                                    onChange={(e) => setOkxConfig(prev => ({ ...prev, leverage: parseInt(e.target.value) || 1 }))}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">최대 포지션 (%)</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={100}
                                                    value={okxConfig.max_position_pct}
                                                    onChange={(e) => setOkxConfig(prev => ({ ...prev, max_position_pct: parseInt(e.target.value) || 10 }))}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 가상 지갑 리셋 */}
                                <div className="bg-slate-900 border border-red-800/50 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-red-400" />
                                        가상 지갑 관리
                                    </h3>
                                    <p className="text-sm text-slate-400 mb-4">
                                        가상 지갑을 초기화하면 모든 포지션이 청산되고 잔고가 $10,000으로 재설정됩니다.
                                    </p>
                                    <button
                                        onClick={resetWallet}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium flex items-center gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        지갑 초기화
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 전략 설정 */}
                        {activeTab === "strategy" && (
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                                    <Sliders className="w-5 h-5 text-cyan-400" />
                                    전략 파라미터
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">최소 신뢰도 (%)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={strategyConfig.min_confidence}
                                            onChange={(e) => setStrategyConfig(prev => ({ ...prev, min_confidence: parseInt(e.target.value) || 70 }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">이 값 이상의 신뢰도만 시그널로 인정</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">최대 동시 포지션</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={500}
                                            value={strategyConfig.max_positions}
                                            onChange={(e) => setStrategyConfig(prev => ({ ...prev, max_positions: parseInt(e.target.value) || 100 }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">동시에 보유할 수 있는 최대 포지션 수</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">포지션 크기 (%)</label>
                                        <input
                                            type="number"
                                            min={0.1}
                                            max={100}
                                            step={0.1}
                                            value={strategyConfig.position_size_pct}
                                            onChange={(e) => setStrategyConfig(prev => ({ ...prev, position_size_pct: parseFloat(e.target.value) || 1 }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">각 포지션에 투자할 자산 비율</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">손절 ATR 배수</label>
                                        <input
                                            type="number"
                                            min={0.5}
                                            max={5}
                                            step={0.1}
                                            value={strategyConfig.stop_loss_atr_mult}
                                            onChange={(e) => setStrategyConfig(prev => ({ ...prev, stop_loss_atr_mult: parseFloat(e.target.value) || 1.5 }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">손절가 = 진입가 - (ATR × 배수)</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">익절 RR 비율</label>
                                        <input
                                            type="number"
                                            min={0.5}
                                            max={10}
                                            step={0.1}
                                            value={strategyConfig.take_profit_rr}
                                            onChange={(e) => setStrategyConfig(prev => ({ ...prev, take_profit_rr: parseFloat(e.target.value) || 2 }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">익절 = 손절폭 × RR 비율</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">스캔 주기 (초)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={60}
                                            value={strategyConfig.scan_interval}
                                            onChange={(e) => setStrategyConfig(prev => ({ ...prev, scan_interval: parseInt(e.target.value) || 5 }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 알림 설정 */}
                        {activeTab === "notifications" && (
                            <div className="space-y-6">
                                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                                        <Bell className="w-5 h-5 text-cyan-400" />
                                        텔레그램 알림
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-slate-300">텔레그램 알림 활성화</label>
                                            <button
                                                onClick={() => setNotifyConfig(prev => ({ ...prev, telegram_enabled: !prev.telegram_enabled }))}
                                                className={cn(
                                                    "w-12 h-6 rounded-full transition-colors relative",
                                                    notifyConfig.telegram_enabled ? "bg-green-500" : "bg-slate-700"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                                                    notifyConfig.telegram_enabled ? "translate-x-6" : "translate-x-0.5"
                                                )} />
                                            </button>
                                        </div>

                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Bot Token</label>
                                            <input
                                                type="text"
                                                value={notifyConfig.telegram_token}
                                                onChange={(e) => setNotifyConfig(prev => ({ ...prev, telegram_token: e.target.value }))}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                                placeholder="123456789:ABCdefGHI..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Chat ID</label>
                                            <input
                                                type="text"
                                                value={notifyConfig.telegram_chat_id}
                                                onChange={(e) => setNotifyConfig(prev => ({ ...prev, telegram_chat_id: e.target.value }))}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                                placeholder="-1001234567890"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-slate-100 mb-4">알림 조건</h3>
                                    <div className="space-y-3">
                                        {[
                                            { key: "notify_on_signal", label: "새 시그널 발생 시" },
                                            { key: "notify_on_trade", label: "거래 체결/종료 시" },
                                            { key: "notify_on_error", label: "오류 발생 시" }
                                        ].map((item) => (
                                            <div key={item.key} className="flex items-center justify-between">
                                                <label className="text-sm text-slate-300">{item.label}</label>
                                                <button
                                                    onClick={() => setNotifyConfig(prev => ({ ...prev, [item.key]: !prev[item.key as keyof NotifyConfig] }))}
                                                    className={cn(
                                                        "w-12 h-6 rounded-full transition-colors relative",
                                                        notifyConfig[item.key as keyof NotifyConfig] ? "bg-green-500" : "bg-slate-700"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                                                        notifyConfig[item.key as keyof NotifyConfig] ? "translate-x-6" : "translate-x-0.5"
                                                    )} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 시스템 설정 */}
                        {activeTab === "system" && (
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                                    <Server className="w-5 h-5 text-cyan-400" />
                                    시스템 설정
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-slate-300">자동 스캔 활성화</label>
                                        <button
                                            onClick={() => setSystemConfig(prev => ({ ...prev, auto_scan_enabled: !prev.auto_scan_enabled }))}
                                            className={cn(
                                                "w-12 h-6 rounded-full transition-colors relative",
                                                systemConfig.auto_scan_enabled ? "bg-green-500" : "bg-slate-700"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                                                systemConfig.auto_scan_enabled ? "translate-x-6" : "translate-x-0.5"
                                            )} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-slate-300">자동 가격 업데이트</label>
                                        <button
                                            onClick={() => setSystemConfig(prev => ({ ...prev, auto_price_update: !prev.auto_price_update }))}
                                            className={cn(
                                                "w-12 h-6 rounded-full transition-colors relative",
                                                systemConfig.auto_price_update ? "bg-green-500" : "bg-slate-700"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                                                systemConfig.auto_price_update ? "translate-x-6" : "translate-x-0.5"
                                            )} />
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">로그 레벨</label>
                                        <select
                                            value={systemConfig.log_level}
                                            onChange={(e) => setSystemConfig(prev => ({ ...prev, log_level: e.target.value }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                        >
                                            <option value="DEBUG">DEBUG</option>
                                            <option value="INFO">INFO</option>
                                            <option value="WARNING">WARNING</option>
                                            <option value="ERROR">ERROR</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">최대 로그 항목 수</label>
                                        <input
                                            type="number"
                                            min={100}
                                            max={10000}
                                            value={systemConfig.max_log_entries}
                                            onChange={(e) => setSystemConfig(prev => ({ ...prev, max_log_entries: parseInt(e.target.value) || 1000 }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">데이터 보관 기간 (일)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={365}
                                            value={systemConfig.data_retention_days}
                                            onChange={(e) => setSystemConfig(prev => ({ ...prev, data_retention_days: parseInt(e.target.value) || 30 }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
