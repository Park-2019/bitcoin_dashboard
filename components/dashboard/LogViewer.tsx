"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { api, Signal, LogEntry as ApiLogEntry } from "@/lib/api";
import { Play, Pause, Trash2, Download, RefreshCw, Server } from "lucide-react";

interface LogEntry {
    timestamp: string;
    level: "INFO" | "WARN" | "ERROR" | "SUCCESS" | "DEBUG" | "SIGNAL" | "WARNING";
    message: string;
    data?: any;
    module?: string;
}

interface LogViewerProps {
    compact?: boolean;  // 컴팩트 모드 (포트폴리오 페이지용)
}

export function LogViewer({ compact = false }: LogViewerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [filterLevel, setFilterLevel] = useState<LogEntry['level'] | 'ALL'>('ALL');
    const [lastLogTimestamp, setLastLogTimestamp] = useState<string>("");

    // 백엔드 로그 가져오기
    const fetchBackendLogs = useCallback(async () => {
        if (isPaused) return;

        try {
            const res = await api.getLogs(100);
            if (res.success && res.data) {
                const backendLogs = res.data.map(log => ({
                    timestamp: log.timestamp,
                    level: (log.level === "WARNING" ? "WARN" : log.level) as LogEntry['level'],
                    message: log.message,
                    module: log.module
                }));
                
                // 새 로그만 추가 (중복 방지)
                setLogs(prev => {
                    const existingTimestamps = new Set(prev.map(l => l.timestamp + l.message));
                    const newLogs = backendLogs.filter(l => !existingTimestamps.has(l.timestamp + l.message));
                    
                    if (newLogs.length > 0) {
                        // 합치고 시간순 정렬 후 최신 100개만 유지
                        const combined = [...prev, ...newLogs]
                            .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
                            .slice(-100);
                        return combined;
                    }
                    return prev;
                });
            }
        } catch (error) {
            // 에러 시 조용히 무시
        }
    }, [isPaused]);

    // 로그 추가 (프론트엔드 이벤트용)
    const addLog = useCallback((level: LogEntry['level'], message: string, data?: any) => {
        setLogs(prev => {
            const newLog: LogEntry = {
                timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
                level,
                message,
                data,
                module: "frontend"
            };
            return [...prev.slice(-99), newLog]; // 최근 100개만 유지
        });
    }, []);

    // 초기 로그 및 백엔드 로그 가져오기
    useEffect(() => {
        addLog("INFO", "🚀 BitQuant 대시보드 시작됨");
        fetchBackendLogs();
    }, [addLog, fetchBackendLogs]);

    // 주기적 백엔드 로그 폴링
    useEffect(() => {
        const interval = setInterval(fetchBackendLogs, 3000);
        return () => clearInterval(interval);
    }, [fetchBackendLogs]);

    // 자동 스크롤
    useEffect(() => {
        if (scrollRef.current && !isPaused) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isPaused]);

    const getLogLevelClass = (level: LogEntry['level']) => {
        switch (level) {
            case "INFO": return "text-blue-400";
            case "WARN": return "text-amber-400";
            case "ERROR": return "text-red-400";
            case "SUCCESS": return "text-green-400";
            case "DEBUG": return "text-purple-400";
            case "SIGNAL": return "text-cyan-400";
            default: return "text-slate-400";
        }
    };

    const filteredLogs = logs.filter(log => filterLevel === 'ALL' || log.level === filterLevel);

    const handleDownloadLogs = () => {
        const content = logs.map(log => `[${log.timestamp}] ${log.level}: ${log.message}`).join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bitquant_logs_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const levelLabels: Record<string, string> = {
        ALL: '전체',
        INFO: '정보',
        SUCCESS: '성공',
        WARN: '경고',
        WARNING: '경고',
        ERROR: '오류',
        DEBUG: '디버그'
    };

    // 로그 새로고침
    const handleRefresh = useCallback(() => {
        fetchBackendLogs();
    }, [fetchBackendLogs]);

    // 로그 초기화 (백엔드 + 프론트엔드)
    const handleClearLogs = useCallback(async () => {
        setLogs([]);
        try {
            await api.clearLogs();
        } catch (e) {
            // 에러 무시
        }
    }, []);

    return (
        <div className={cn("flex flex-col", compact ? "h-[300px]" : "h-full")}>
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-slate-900/50">
                <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                    <Server className="w-4 h-4 text-green-400" />
                    {compact ? "시스템 로그" : "실시간 로그"}
                </h3>
                <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 font-mono">
                        {isPaused ? "일시정지" : "실시간"}
                    </span>
                    <button
                        className="p-1 text-slate-400 hover:text-slate-200"
                        onClick={() => setIsPaused(!isPaused)}
                        title={isPaused ? "재생" : "일시정지"}
                    >
                        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                    <button
                        className="p-1 text-slate-400 hover:text-slate-200"
                        onClick={handleRefresh}
                        title="새로고침"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        className="p-1 text-slate-400 hover:text-slate-200"
                        onClick={handleClearLogs}
                        title="로그 지우기"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    {!compact && (
                        <button
                            className="p-1 text-slate-400 hover:text-slate-200"
                            onClick={handleDownloadLogs}
                            title="로그 다운로드"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Filter */}
            <div className="px-4 py-2 border-b border-slate-800 flex gap-1 overflow-x-auto bg-slate-900/30">
                {['ALL', 'INFO', 'SUCCESS', 'WARN', 'ERROR', 'DEBUG'].map(level => (
                    <button
                        key={level}
                        className={cn(
                            "px-2 py-0.5 text-[10px] rounded-full font-mono whitespace-nowrap",
                            filterLevel === level
                                ? "bg-green-600/30 text-green-300 border border-green-600/50"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        )}
                        onClick={() => setFilterLevel(level as LogEntry['level'] | 'ALL')}
                    >
                        {levelLabels[level]}
                    </button>
                ))}
            </div>

            {/* Logs */}
            <div
                ref={scrollRef}
                className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-0.5 bg-slate-950"
            >
                {filteredLogs.length === 0 ? (
                    <div className="text-slate-500 text-center py-4">
                        표시할 로그가 없습니다.
                    </div>
                ) : (
                    filteredLogs.map((log, i) => (
                        <div key={i} className="flex gap-2 hover:bg-slate-900/50 px-1 py-0.5 rounded">
                            <span className="text-slate-600 flex-shrink-0">[{log.timestamp.split(' ')[1] || log.timestamp}]</span>
                            <span className={cn("flex-shrink-0 w-14", getLogLevelClass(log.level))}>
                                {log.level === "WARNING" ? "WARN" : log.level}
                            </span>
                            {log.module && (
                                <span className="text-slate-600 flex-shrink-0">[{log.module}]</span>
                            )}
                            <span className="text-slate-300 break-all">{log.message}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
