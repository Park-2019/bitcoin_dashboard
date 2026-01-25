"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import api, { 
    HealthStatus, 
    OKXStatus, 
    Signal, 
    Stats, 
    MarketMetrics,
    Position,
    ApiResponse 
} from '@/lib/api';

// ============== 범용 Polling Hook ==============

interface UsePollingOptions<T> {
    fetcher: () => Promise<ApiResponse<T>>;
    interval?: number;
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
}

export function usePolling<T>({ 
    fetcher, 
    interval = 5000, 
    enabled = true,
    onSuccess,
    onError 
}: UsePollingOptions<T>) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const fetcherRef = useRef(fetcher);
    
    fetcherRef.current = fetcher;

    const refresh = useCallback(async () => {
        try {
            const response = await fetcherRef.current();
            if (response.success && response.data) {
                setData(response.data);
                setError(null);
                onSuccess?.(response.data);
            } else {
                setError(response.error || '데이터 로드 실패');
                onError?.(response.error || '데이터 로드 실패');
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : '알 수 없는 오류';
            setError(errorMsg);
            onError?.(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [onSuccess, onError]);

    useEffect(() => {
        if (!enabled) return;

        refresh();
        const timer = setInterval(refresh, interval);
        
        return () => clearInterval(timer);
    }, [enabled, interval, refresh]);

    return { data, error, loading, refresh };
}

// ============== 상태 Hook ==============

export function useHealth(interval = 10000) {
    return usePolling<HealthStatus>({
        fetcher: api.health,
        interval,
    });
}

export function useOKXStatus(interval = 5000) {
    return usePolling<OKXStatus>({
        fetcher: api.getOKXStatus,
        interval,
    });
}

// ============== 시그널 Hook ==============

export function useSignals(interval = 3000) {
    const [signals, setSignals] = useState<Signal[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            // 가격 업데이트 먼저 실행
            await api.updateSignals();
            
            // 시그널 조회
            const response = await api.getSignals();
            if (response.success && response.data) {
                setSignals(response.data);
                setError(null);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : '시그널 로드 실패');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        const timer = setInterval(refresh, interval);
        return () => clearInterval(timer);
    }, [interval, refresh]);

    const closeSignal = useCallback(async (signalId: string) => {
        const response = await api.closeSignal(signalId);
        if (response.success) {
            await refresh();
        }
        return response;
    }, [refresh]);

    return { signals, error, loading, refresh, closeSignal };
}

// ============== 포지션 Hook ==============

export function usePositions(interval = 3000) {
    return usePolling<Position[]>({
        fetcher: api.getPositions,
        interval,
    });
}

// ============== 통계 Hook ==============

export function useStats(interval = 10000) {
    return usePolling<Stats>({
        fetcher: api.getStats,
        interval,
    });
}

// ============== 시장 지표 Hook ==============

export function useMarket(interval = 30000) {
    return usePolling<MarketMetrics>({
        fetcher: api.getMarket,
        interval,
    });
}

// ============== 히스토리 Hook ==============

export function useHistory(limit = 100, status?: string) {
    const [history, setHistory] = useState<Signal[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const response = await api.getHistory(limit, status);
            if (response.success && response.data) {
                setHistory(response.data);
                setError(null);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : '히스토리 로드 실패');
        } finally {
            setLoading(false);
        }
    }, [limit, status]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { history, error, loading, refresh };
}

// ============== 분석 Hook ==============

export function useAnalysis(symbol: string | null, interval = '1h') {
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const analyze = useCallback(async (sym?: string) => {
        const targetSymbol = sym || symbol;
        if (!targetSymbol) return;

        setLoading(true);
        setError(null);

        try {
            const response = await api.analyze(targetSymbol, interval);
            if (response.success && response.data) {
                setData(response.data);
            } else {
                setError(response.error || '분석 실패');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : '분석 오류');
        } finally {
            setLoading(false);
        }
    }, [symbol, interval]);

    useEffect(() => {
        if (symbol) {
            analyze();
        }
    }, [symbol, analyze]);

    return { data, error, loading, analyze };
}

// ============== 스캔 Hook ==============

export function useScan() {
    const [results, setResults] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [scanInfo, setScanInfo] = useState<{ scanned: number; tracked: number } | null>(null);

    const scan = useCallback(async (options?: { 
        top_n?: number; 
        min_score?: number; 
        interval?: string 
    }) => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.scan(options);
            if (response.success && response.data) {
                setResults(response.data.data || []);
                setScanInfo({
                    scanned: response.data.scanned || 0,
                    tracked: response.data.tracked || 0,
                });
            } else {
                setError(response.error || '스캔 실패');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : '스캔 오류');
        } finally {
            setLoading(false);
        }
    }, []);

    return { results, error, loading, scan, scanInfo };
}

// ============== 설정 Hook ==============

export function useOKXConfig() {
    const [config, setConfig] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const response = await api.getOKXConfig();
            if (response.success && response.data) {
                setConfig(response.data);
                setError(null);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : '설정 로드 실패');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const updateConfig = useCallback(async (newConfig: Record<string, any>) => {
        setSaving(true);
        try {
            const response = await api.updateOKXConfig(newConfig);
            if (response.success) {
                await refresh();
                return { success: true };
            }
            return { success: false, error: response.error };
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : '저장 실패' };
        } finally {
            setSaving(false);
        }
    }, [refresh]);

    return { config, error, loading, saving, refresh, updateConfig };
}

export function useNotifyConfig() {
    const [config, setConfig] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const response = await api.getNotifyConfig();
            if (response.success && response.data) {
                setConfig(response.data);
                setError(null);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : '설정 로드 실패');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const updateConfig = useCallback(async (newConfig: Record<string, any>) => {
        setSaving(true);
        try {
            const response = await api.updateNotifyConfig(newConfig);
            if (response.success) {
                await refresh();
                return { success: true };
            }
            return { success: false, error: response.error };
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : '저장 실패' };
        } finally {
            setSaving(false);
        }
    }, [refresh]);

    const testNotify = useCallback(async () => {
        const response = await api.testNotify();
        return response.success;
    }, []);

    return { config, error, loading, saving, refresh, updateConfig, testNotify };
}
