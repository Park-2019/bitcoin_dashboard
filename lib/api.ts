/**
 * Bitcoin Analysis System API Client
 * 백엔드 Flask API와 통신하는 클라이언트
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// ============== 타입 정의 ==============

export interface HealthStatus {
    status: string;
    version: string;
    timestamp: string;
    auto_scan?: {
        enabled: boolean;
        interval_sec: number;
        top_n: number;
        min_score: number;
        last_scan_at: string | null;
        last_error: string | null;
    };
    auto_price?: {
        enabled: boolean;
        interval_sec: number;
        last_price_at: string | null;
        last_error: string | null;
    };
}

export interface OKXStatus {
    connected: boolean;
    enabled: boolean;
    is_demo: boolean;
    balance?: {
        total: number;
        available: number;
        used: number;
    };
    positions?: Position[];
    stats?: {
        daily_pnl: number;
        daily_trades: number;
        total_pnl: number;
        win_rate: number;
    };
}

export interface Position {
    symbol: string;
    side: 'long' | 'short';
    size: number;
    entry_price: number;
    mark_price: number;
    pnl: number;
    pnl_percent: number;
    leverage: number;
    margin: number;
    liq_price: number;
}

export interface Signal {
    id: string;
    symbol: string;
    direction: 'long' | 'short';
    entry_price: number;
    current_price: number;
    stop_loss: number;
    take_profit: number;
    confidence: number;
    pnl_percent: number;
    status: 'active' | 'tp_hit' | 'sl_hit' | 'manual_close' | 'expired';
    market_phase: string;
    entry_reason: string;
    created_at: string;
    updated_at: string;
}

export interface AnalysisResult {
    symbol: string;
    current_price: number;
    market_phase: string;
    entry_score: number;
    technical: {
        trend: string;
        rsi: number;
        macd_signal: string;
        bb_position: string;
        atr: number;
        overall_score: number;
    };
    volume: {
        ratio: number;
        trend: string;
        overall_score: number;
    };
    onchain?: {
        exchange_flow: string;
        whale_activity: string;
        overall_score: number;
    };
    plan: {
        entry_price: number;
        stop_loss: number;
        take_profit_1: number;
        take_profit_2: number;
        risk_reward: number;
        entry_reason: string;
    };
    bullish_signals: string[];
    bearish_signals: string[];
}

export interface ScanResult {
    success: boolean;
    data: AnalysisResult[];
    count: number;
    scanned: number;
    tracked?: number;
}

export interface Stats {
    total_signals: number;
    active_signals: number;
    closed_signals: number;
    tp_hit: number;
    sl_hit: number;
    manual_close: number;
    win_rate: number;
    avg_pnl: number;
    total_pnl: number;
    best_trade: number;
    worst_trade: number;
}

export interface MarketMetrics {
    btc_price: number;
    btc_change_24h: number;
    btc_dominance: number;
    total_market_cap: number;
    fear_greed_index: number;
    funding_rate: number;
}

export interface OHLCVData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// ============== API 함수 ==============

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });

        const data = await response.json();
        
        if (!response.ok) {
            return { success: false, error: data.error || `HTTP ${response.status}` };
        }

        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : '네트워크 오류' 
        };
    }
}

// 상태 API
export const api = {
    // 헬스 체크
    health: () => fetchApi<HealthStatus>('/api/health'),

    // OKX 상태
    getOKXStatus: () => fetchApi<OKXStatus>('/api/okx/status'),
    
    // OKX 연결
    connectOKX: () => fetchApi<{ message: string }>('/api/okx/connect', { method: 'POST' }),
    disconnectOKX: () => fetchApi<{ message: string }>('/api/okx/disconnect', { method: 'POST' }),

    // 잔고/포지션
    getBalance: () => fetchApi<{ total: number; available: number; used: number }>('/api/okx/balance'),
    getPositions: () => fetchApi<Position[]>('/api/okx/positions'),

    // 시그널 API
    getSignals: () => fetchApi<Signal[]>('/api/signals'),
    addSignal: (signal: Partial<Signal>) => 
        fetchApi<{ id: string }>('/api/signals/add', {
            method: 'POST',
            body: JSON.stringify(signal),
        }),
    closeSignal: (signalId: string) => 
        fetchApi<{ success: boolean }>(`/api/signals/close/${signalId}`, { method: 'POST' }),
    updateSignals: () => 
        fetchApi<{ updated: number; closed: number }>('/api/signals/update', { method: 'POST' }),

    // 분석 API
    analyze: (symbol: string, interval: string = '1h') => 
        fetchApi<AnalysisResult>(`/api/analyze/${symbol}?interval=${interval}`),
    
    scan: (options?: { top_n?: number; min_score?: number; interval?: string }) =>
        fetchApi<ScanResult>('/api/scan', {
            method: 'POST',
            body: JSON.stringify(options || {}),
        }),

    // 히스토리/통계
    getHistory: (limit: number = 100, status?: string) => {
        let url = `/api/history?limit=${limit}`;
        if (status) url += `&status=${status}`;
        return fetchApi<Signal[]>(url);
    },
    getStats: () => fetchApi<Stats>('/api/stats'),

    // 시장 지표
    getMarket: () => fetchApi<MarketMetrics>('/api/market'),
    getPrice: (symbol: string) => fetchApi<{ price: number; symbol: string }>(`/api/price/${symbol}`),
    
    // OHLCV 캔들 데이터
    getOHLCV: (symbol: string, interval: string = '1h', limit: number = 200) => 
        fetchApi<{ symbol: string; interval: string; ohlcv: OHLCVData[] }>(
            `/api/ohlcv/${symbol}?interval=${interval}&limit=${limit}`
        ),

    // 거래 실행
    executeSignal: (signal: {
        symbol: string;
        direction: 'long' | 'short';
        entry_price: number;
        stop_loss: number;
        take_profit: number;
        confidence: number;
    }) => fetchApi<{ success: boolean; order_id?: string }>('/api/okx/execute', {
        method: 'POST',
        body: JSON.stringify(signal),
    }),

    closePosition: (symbol: string) => 
        fetchApi<{ success: boolean }>(`/api/okx/close/${symbol}`, { method: 'POST' }),
    
    closeAllPositions: () => 
        fetchApi<{ success: boolean; closed: number }>('/api/okx/close-all', { method: 'POST' }),

    // OKX 거래 내역
    getTradeHistory: () => fetchApi<any[]>('/api/okx/history'),

    // 설정 API
    getOKXConfig: () => fetchApi<{
        enabled: boolean;
        is_demo: boolean;
        api_key: string;
        leverage: number;
        max_positions: number;
        position_size: number;
        auto_trade: boolean;
    }>('/api/okx/config'),

    updateOKXConfig: (config: Record<string, any>) =>
        fetchApi<{ message: string }>('/api/okx/config', {
            method: 'POST',
            body: JSON.stringify(config),
        }),

    // 알림 설정
    getNotifyConfig: () => fetchApi<{
        enabled: boolean;
        telegram_token: string;
        telegram_chat_id: string;
        min_confidence: number;
    }>('/api/notify/config'),

    updateNotifyConfig: (config: Record<string, any>) =>
        fetchApi<{ success: boolean }>('/api/notify/config', {
            method: 'POST',
            body: JSON.stringify(config),
        }),

    testNotify: () => fetchApi<{ success: boolean }>('/api/notify/test', { method: 'POST' }),
};

export default api;
