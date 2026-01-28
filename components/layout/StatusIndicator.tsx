"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { api, OKXStatus, HealthStatus } from "@/lib/api";
import { 
    ShieldCheck, 
    ShieldAlert, 
    Wifi, 
    WifiOff,
    TrendingUp,
    Zap,
    Clock,
    RefreshCw
} from "lucide-react";

interface StatusIndicatorProps {
    onStatusChange?: (status: OKXStatus | null) => void;
}

export function StatusIndicator({ onStatusChange }: StatusIndicatorProps) {
    const [currentTime, setCurrentTime] = useState<string>("");
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [okxStatus, setOkxStatus] = useState<OKXStatus | null>(null);
    const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);

    // 시간 업데이트
    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(new Date().toISOString().slice(0, 19).replace('T', ' '));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // API 상태 체크
    const fetchStatus = useCallback(async () => {
        try {
            // 헬스 체크
            const healthResponse = await api.health();
            if (healthResponse.success && healthResponse.data) {
                setHealthStatus(healthResponse.data);
                setIsConnected(true);
                setLastError(null);
            } else {
                setIsConnected(false);
                setLastError("백엔드 연결 실패");
            }

            // OKX 상태 체크
            const okxResponse = await api.getOKXStatus();
            if (okxResponse.success && okxResponse.data) {
                setOkxStatus(okxResponse.data);
                onStatusChange?.(okxResponse.data);
            }
        } catch (error) {
            setIsConnected(false);
            setLastError("API 연결 오류");
            console.error("Status fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    }, [onStatusChange]);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000); // 10초마다 갱신
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const botStatus = okxStatus?.connected ? "running" : okxStatus ? "stopped" : "error";
    const mode = okxStatus?.is_demo ? "dry_run" : "live";
    const strategy = healthStatus?.strategy || "퀀트 전략";
    const exchange = healthStatus?.exchange || "OKX";
    const version = healthStatus?.version || "2.0";

    return (
        <div className="flex items-center bg-slate-950 border-b border-slate-800 px-3 py-2 h-10 min-w-0 overflow-x-auto">
            {/* Bot Status */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {isLoading ? (
                    <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />
                ) : (
                    <div className="relative flex h-2 w-2">
                        <span className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                            botStatus === "running" ? "bg-green-400" : botStatus === "stopped" ? "bg-amber-400" : "bg-red-400"
                        )} />
                        <span className={cn(
                            "relative inline-flex rounded-full h-2 w-2",
                            botStatus === "running" ? "bg-green-500" : botStatus === "stopped" ? "bg-amber-500" : "bg-red-500"
                        )} />
                    </div>
                )}
                <span className="text-xs font-medium text-slate-200 whitespace-nowrap">
                    {isLoading ? "연결중..." : botStatus === "running" ? "실행중" : botStatus === "stopped" ? "대기" : "오류"}
                </span>
            </div>

            <div className="h-4 w-px bg-slate-800 mx-2 flex-shrink-0" />

            {/* Run Mode Badge */}
            <div className={cn(
                "flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0",
                mode === "live"
                    ? "bg-red-500/15 text-red-400 border border-red-500/30"
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            )}>
                {mode === "live" ? (
                    <>
                        <ShieldAlert className="w-2.5 h-2.5 mr-0.5" />
                        실거래
                    </>
                ) : (
                    <>
                        <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                        모의
                    </>
                )}
            </div>

            <div className="h-4 w-px bg-slate-800 mx-2 flex-shrink-0" />

            {/* Exchange Info */}
            <div className="flex items-center gap-1 text-[10px] text-slate-400 flex-shrink-0">
                <Zap className="w-2.5 h-2.5 text-amber-500" />
                <span className="font-medium text-slate-300">{exchange}</span>
            </div>

            <div className="h-4 w-px bg-slate-800 mx-2 flex-shrink-0" />

            {/* Strategy */}
            <div className="flex items-center gap-1 text-[10px] flex-shrink-0">
                <TrendingUp className="w-2.5 h-2.5 text-green-500" />
                <span className="font-mono text-slate-300">{strategy}</span>
            </div>

            {/* Stats (if connected) */}
            {okxStatus?.stats && (
                <>
                    <div className="h-4 w-px bg-slate-800 mx-2 flex-shrink-0" />
                    <div className="flex items-center gap-2 text-[10px] flex-shrink-0">
                        <span className="text-slate-500">오늘:</span>
                        <span className={cn(
                            "font-mono",
                            okxStatus.stats.daily_pnl >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                            {okxStatus.stats.daily_pnl >= 0 ? "+" : ""}{okxStatus.stats.daily_pnl.toFixed(2)} USDT
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-400">
                            거래: {okxStatus.stats.daily_trades}
                        </span>
                    </div>
                </>
            )}

            <div className="flex-1 min-w-4" />

            {/* Error Message */}
            {lastError && (
                <div className="text-[10px] text-red-400 mr-2 flex-shrink-0">
                    {lastError}
                </div>
            )}

            {/* Connection Status */}
            <div className="flex items-center gap-1 text-[10px] mr-2 flex-shrink-0">
                {isConnected ? (
                    <>
                        <Wifi className="w-2.5 h-2.5 text-green-500" />
                        <span className="text-green-400 hidden sm:inline">연결됨</span>
                    </>
                ) : (
                    <>
                        <WifiOff className="w-2.5 h-2.5 text-red-500" />
                        <span className="text-red-400 hidden sm:inline">끊김</span>
                    </>
                )}
            </div>

            {/* Version */}
            <div className="text-[10px] text-slate-600 font-mono mr-2 flex-shrink-0 hidden md:block">
                v{version}
            </div>

            {/* Clock */}
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono flex-shrink-0">
                <Clock className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">{currentTime}</span>
            </div>
        </div>
    );
}
