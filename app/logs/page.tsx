"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
    ScrollText, RefreshCw, Search, Filter, Download, Trash2,
    Pause, Play, AlertTriangle, CheckCircle, Info, Bug,
    Zap, AlertCircle, Clock
} from "lucide-react";

interface LogEntry {
    timestamp: string;
    level: "INFO" | "SUCCESS" | "SIGNAL" | "WARNING" | "ERROR" | "DEBUG";
    message: string;
}

type LogFilter = "all" | "INFO" | "SUCCESS" | "SIGNAL" | "WARNING" | "ERROR" | "DEBUG";

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [paused, setPaused] = useState(false);
    const [filter, setFilter] = useState<LogFilter>("all");
    const [searchText, setSearchText] = useState("");
    const [autoScroll, setAutoScroll] = useState(true);
    const logsContainerRef = useRef<HTMLDivElement>(null);

    // 로그 가져오기
    const fetchLogs = useCallback(async () => {
        if (paused) return;
        
        try {
            const response = await api.getLogs();
            if (response.success && response.data) {
                // API에서 받은 로그를 LogEntry 형식으로 변환
                const newLogs = response.data.map((log: { timestamp: string; level: string; message: string }) => ({
                    timestamp: log.timestamp,
                    level: log.level as LogEntry["level"],
                    message: log.message
                }));
                setLogs(newLogs);
            }
        } catch (error) {
            console.error("Logs fetch error:", error);
        }
    }, [paused]);

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 2000);
        return () => clearInterval(interval);
    }, [fetchLogs]);

    // 자동 스크롤
    useEffect(() => {
        if (autoScroll && logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    // 로그 필터링
    const filteredLogs = logs.filter(log => {
        const matchesFilter = filter === "all" || log.level === filter;
        const matchesSearch = log.message.toLowerCase().includes(searchText.toLowerCase()) ||
                             log.timestamp.includes(searchText);
        return matchesFilter && matchesSearch;
    });

    // 로그 레벨 스타일
    const getLevelStyle = (level: string) => {
        switch (level) {
            case "INFO":
                return { bg: "bg-blue-500/20", text: "text-blue-400", icon: Info };
            case "SUCCESS":
                return { bg: "bg-green-500/20", text: "text-green-400", icon: CheckCircle };
            case "SIGNAL":
                return { bg: "bg-purple-500/20", text: "text-purple-400", icon: Zap };
            case "WARNING":
                return { bg: "bg-amber-500/20", text: "text-amber-400", icon: AlertTriangle };
            case "ERROR":
                return { bg: "bg-red-500/20", text: "text-red-400", icon: AlertCircle };
            case "DEBUG":
                return { bg: "bg-slate-500/20", text: "text-slate-400", icon: Bug };
            default:
                return { bg: "bg-slate-700", text: "text-slate-400", icon: Info };
        }
    };

    // 로그 통계
    const stats = {
        total: logs.length,
        info: logs.filter(l => l.level === "INFO").length,
        success: logs.filter(l => l.level === "SUCCESS").length,
        signal: logs.filter(l => l.level === "SIGNAL").length,
        warning: logs.filter(l => l.level === "WARNING").length,
        error: logs.filter(l => l.level === "ERROR").length,
        debug: logs.filter(l => l.level === "DEBUG").length,
    };

    // 로그 지우기
    const clearLogs = () => {
        setLogs([]);
    };

    // 로그 다운로드
    const downloadLogs = () => {
        const content = filteredLogs
            .map(log => `[${log.timestamp}] ${log.level}: ${log.message}`)
            .join("\n");
        
        const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `system_logs_${new Date().toISOString().split("T")[0]}.txt`;
        link.click();
    };

    return (
        <DashboardLayout>
            <div className="p-6 h-full flex flex-col">
                {/* 페이지 헤더 */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                            <ScrollText className="w-7 h-7 text-cyan-400" />
                            시스템 로그
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">실시간 시스템 로그를 확인합니다</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPaused(!paused)}
                            className={cn(
                                "px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
                                paused 
                                    ? "bg-green-600 hover:bg-green-500 text-white" 
                                    : "bg-amber-600 hover:bg-amber-500 text-white"
                            )}
                        >
                            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            {paused ? "재개" : "일시정지"}
                        </button>
                        <button
                            onClick={clearLogs}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            지우기
                        </button>
                        <button
                            onClick={downloadLogs}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            다운로드
                        </button>
                    </div>
                </div>

                {/* 통계 바 */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                    {[
                        { label: "전체", value: stats.total, filter: "all" as LogFilter, color: "text-slate-300" },
                        { label: "정보", value: stats.info, filter: "INFO" as LogFilter, color: "text-blue-400" },
                        { label: "성공", value: stats.success, filter: "SUCCESS" as LogFilter, color: "text-green-400" },
                        { label: "시그널", value: stats.signal, filter: "SIGNAL" as LogFilter, color: "text-purple-400" },
                        { label: "경고", value: stats.warning, filter: "WARNING" as LogFilter, color: "text-amber-400" },
                        { label: "오류", value: stats.error, filter: "ERROR" as LogFilter, color: "text-red-400" },
                        { label: "디버그", value: stats.debug, filter: "DEBUG" as LogFilter, color: "text-slate-400" },
                    ].map((stat) => (
                        <button
                            key={stat.filter}
                            onClick={() => setFilter(stat.filter)}
                            className={cn(
                                "bg-slate-900 border rounded-lg p-3 text-center transition-all",
                                filter === stat.filter 
                                    ? "border-cyan-500 ring-1 ring-cyan-500/30" 
                                    : "border-slate-800 hover:border-slate-700"
                            )}
                        >
                            <div className={cn("text-xl font-bold", stat.color)}>{stat.value}</div>
                            <div className="text-xs text-slate-500">{stat.label}</div>
                        </button>
                    ))}
                </div>

                {/* 검색 */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="로그 검색..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoScroll}
                                onChange={(e) => setAutoScroll(e.target.checked)}
                                className="rounded border-slate-600"
                            />
                            자동 스크롤
                        </label>
                        <span className="text-sm text-slate-500">
                            {filteredLogs.length}개 표시
                        </span>
                    </div>
                </div>

                {/* 로그 목록 */}
                <div 
                    ref={logsContainerRef}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg overflow-auto font-mono text-sm"
                >
                    {filteredLogs.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            <div className="text-center">
                                <ScrollText className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                                <p>표시할 로그가 없습니다</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 space-y-1">
                            {filteredLogs.map((log, idx) => {
                                const style = getLevelStyle(log.level);
                                const Icon = style.icon;
                                
                                return (
                                    <div 
                                        key={idx}
                                        className={cn(
                                            "flex items-start gap-3 p-2 rounded hover:bg-slate-900/50 transition-colors",
                                            log.level === "ERROR" && "bg-red-500/5",
                                            log.level === "WARNING" && "bg-amber-500/5",
                                            log.level === "SIGNAL" && "bg-purple-500/5"
                                        )}
                                    >
                                        <span className="text-slate-600 text-xs whitespace-nowrap flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {log.timestamp}
                                        </span>
                                        <span className={cn(
                                            "text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap",
                                            style.bg, style.text
                                        )}>
                                            <Icon className="w-3 h-3" />
                                            {log.level}
                                        </span>
                                        <span className="text-slate-300 break-all">
                                            {log.message}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 상태 바 */}
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        {paused ? (
                            <span className="flex items-center gap-1 text-amber-400">
                                <Pause className="w-3 h-3" />
                                일시정지됨
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-green-400">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                실시간 업데이트 중
                            </span>
                        )}
                    </div>
                    <span>업데이트 주기: 2초</span>
                </div>
            </div>
        </DashboardLayout>
    );
}
