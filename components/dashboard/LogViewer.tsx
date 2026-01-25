"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { api, Signal } from "@/lib/api";
import { Play, Pause, Trash2, Download, RefreshCw } from "lucide-react";

interface LogEntry {
    timestamp: string;
    level: "INFO" | "WARN" | "ERROR" | "SUCCESS" | "DEBUG" | "SIGNAL";
    message: string;
    data?: any;
}

export function LogViewer() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [filterLevel, setFilterLevel] = useState<LogEntry['level'] | 'ALL'>('ALL');
    const [lastSignalIds, setLastSignalIds] = useState<Set<string>>(new Set());

    // 시그널 변화 감지 및 로그 생성
    const checkForUpdates = useCallback(async () => {
        if (isPaused) return;

        try {
            // 헬스 체크
            const healthRes = await api.health();
            if (healthRes.success && healthRes.data) {
                const health = healthRes.data;
                
                // 자동 스캔 상태 로그
                if (health.auto_scan?.last_scan_at) {
                    addLog("INFO", `자동 스캔 완료 (top ${health.auto_scan.top_n}, min ${health.auto_scan.min_score}%)`);
                }
                if (health.auto_scan?.last_error) {
                    addLog("ERROR", `스캔 오류: ${health.auto_scan.last_error}`);
                }
            }

            // 시그널 변화 감지
            const signalsRes = await api.getSignals();
            if (signalsRes.success && signalsRes.data) {
                const currentIds = new Set(signalsRes.data.map(s => s.id));
                
                // 새 시그널 감지
                signalsRes.data.forEach(signal => {
                    if (!lastSignalIds.has(signal.id)) {
                        addLog("SIGNAL", `🎯 새 시그널: ${signal.symbol} ${signal.direction.toUpperCase()} (${signal.confidence.toFixed(0)}%)`, signal);
                    }
                });

                // 종료된 시그널 감지
                lastSignalIds.forEach(id => {
                    if (!currentIds.has(id)) {
                        addLog("SUCCESS", `✅ 시그널 종료: ${id.substring(0, 8)}...`);
                    }
                });

                setLastSignalIds(currentIds);
            }

            // 통계 업데이트
            const statsRes = await api.getStats();
            if (statsRes.success && statsRes.data) {
                const stats = statsRes.data;
                if (stats.active_signals > 0) {
                    addLog("DEBUG", `활성 시그널: ${stats.active_signals}, 승률: ${stats.win_rate.toFixed(1)}%`);
                }
            }

        } catch (error) {
            addLog("ERROR", `API 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
    }, [isPaused, lastSignalIds]);

    // 로그 추가
    const addLog = useCallback((level: LogEntry['level'], message: string, data?: any) => {
        setLogs(prev => {
            const newLog: LogEntry = {
                timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
                level,
                message,
                data
            };
            return [...prev.slice(-99), newLog]; // 최근 100개만 유지
        });
    }, []);

    // 초기 로그
    useEffect(() => {
        addLog("INFO", "🚀 BitQuant 대시보드 시작됨");
        addLog("INFO", "백엔드 연결 중...");
        
        // 초기 연결 체크
        api.health().then(res => {
            if (res.success) {
                addLog("SUCCESS", `✅ 백엔드 연결됨 (v${res.data?.version})`);
            } else {
                addLog("ERROR", "❌ 백엔드 연결 실패");
            }
        });
    }, [addLog]);

    // 주기적 업데이트
    useEffect(() => {
        const interval = setInterval(checkForUpdates, 5000);
        return () => clearInterval(interval);
    }, [checkForUpdates]);

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
        ERROR: '오류',
        DEBUG: '디버그',
        SIGNAL: '시그널'
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800">
                <h3 className="font-semibold text-slate-100">실시간 로그</h3>
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
                        onClick={() => setLogs([])}
                        title="로그 지우기"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        className="p-1 text-slate-400 hover:text-slate-200"
                        onClick={handleDownloadLogs}
                        title="로그 다운로드"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="px-4 py-2 border-b border-slate-800 flex gap-1 overflow-x-auto">
                {['ALL', 'INFO', 'SUCCESS', 'SIGNAL', 'WARN', 'ERROR', 'DEBUG'].map(level => (
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
                            <span className="text-slate-600 flex-shrink-0">[{log.timestamp.split(' ')[1]}]</span>
                            <span className={cn("flex-shrink-0 w-16", getLogLevelClass(log.level))}>
                                {log.level}
                            </span>
                            <span className="text-slate-300 break-all">{log.message}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
