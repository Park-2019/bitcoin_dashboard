/**
 * Bitcoin Analysis System API Client
 * 백엔드 Flask API와 통신하는 클라이언트
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// ============== 타입 정의 ==============

export interface HealthStatus {
    status: string;
    version: string;
    strategy?: string;
    exchange?: string;
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

export interface WalletInfo {
    initial_balance: number;
    current_balance: number;
    available_balance: number;
    in_positions: number;
    total_balance: number;
    unrealized_pnl: number;
    total_realized_pnl: number;
    daily_pnl: number;
    daily_trades: number;
    total_return_percent: number;
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
    wallet?: WalletInfo;
    stats?: {
        daily_pnl: number;
        daily_trades: number;
        total_pnl: number;
        total_realized_pnl: number;
        unrealized_pnl: number;
        win_rate: number;
        total_return_percent: number;
        best_trade: number;
        worst_trade: number;
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
    source?: 'okx' | 'quant_bot';
    entry_score?: number;      // 시그널 진입 점수
    market_phase?: string;      // 시장 단계
}

export interface SpotAsset {
    currency: string;
    total: number;
    available: number;
    frozen: number;
    usd_value: number;
}

export interface CombinedPosition {
    symbol: string;
    direction: 'long' | 'short';
    entry_price: number;
    current_price: number;
    pnl_percent: number;
    position_usdt: number;
    unrealized_pnl: number;
    stop_loss: number;
    take_profit: number;
    confidence: number;
    source: 'okx' | 'quant_bot';
    created_at?: string;
    leverage?: number;
    liq_price?: number;
}

export interface CombinedPortfolio {
    summary: {
        total_positions: number;
        virtual_positions: number;
        okx_positions: number;
        okx_connected: boolean;
    };
    pnl: {
        virtual_unrealized: number;
        virtual_realized: number;
        okx_unrealized: number;
        combined_unrealized: number;
    };
    wallet: {
        virtual: WalletInfo;
        okx: {
            total_usdt: number;
            free_usdt: number;
            used_usdt: number;
        };
    };
    spot_assets: SpotAsset[];
    positions: CombinedPosition[];
}

export interface QueueStatus {
    queue_size: number;
    max_queue_size: number;
    total_queued: number;
    total_executed: number;
    total_expired: number;
    top_signals: {
        symbol: string;
        confidence: number;
        priority: number;
    }[];
    dynamic_info?: {
        total_balance: number;
        optimal_positions: number;
        current_positions: number;
        available_slots: number;
        position_size_usdt: number;
        auto_trade_enabled: boolean;
    };
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
    updated_at?: string;
    closed_at?: string;
    // 포지션 관련 필드
    position_size?: number;      // 포지션 수량
    position_usdt?: number;      // 포지션 금액 (USDT)
    unrealized_pnl?: number;     // 미실현 손익
    realized_pnl?: number;       // 실현 손익
    final_pnl?: number;          // 최종 손익률
    source?: 'okx' | 'quant_bot';  // 출처
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

    // 지갑 API
    getWallet: () => fetchApi<WalletInfo>('/api/wallet'),
    resetWallet: (initialBalance: number = 10000) =>
        fetchApi<{ success: boolean; message: string }>('/api/wallet/reset', {
            method: 'POST',
            body: JSON.stringify({ initial_balance: initialBalance }),
        }),

    // 로그 API
    getLogs: (limit: number = 200) => fetchApi<{ timestamp: string; level: string; message: string }[]>(`/api/logs?limit=${limit}`),

    // 시그널 생성 API
    createSignal: (params: {
        symbol: string;
        direction: 'long' | 'short';
        entry_price: number;
        confidence: number;
    }) => fetchApi<{ success: boolean; signal_id: string }>('/api/signals/create', {
        method: 'POST',
        body: JSON.stringify(params),
    }),

    // OKX 실거래 API
    getOKXFullStatus: () => fetchApi<OKXFullStatus>('/api/okx/full-status'),
    
    enableAutoTrade: (enabled: boolean) => 
        fetchApi<{ success: boolean; auto_trade_enabled: boolean; message: string }>('/api/okx/enable-auto-trade', {
            method: 'POST',
            body: JSON.stringify({ enabled }),
        }),
    
    // 현물 자산 조회
    getSpotAssets: () => fetchApi<SpotAsset[]>('/api/okx/spot-assets'),
    
    // OKX 포지션 동기화
    syncOKXPositions: () => 
        fetchApi<{ success: boolean; synced: number; skipped: number; message: string }>('/api/okx/sync-positions', {
            method: 'POST',
        }),
    
    // OKX 포트폴리오
    getOKXPortfolio: () => fetchApi<{
        balance: { total_usdt: number; free_usdt: number; used_usdt: number };
        spot_assets: { count: number; total_usd_value: number; assets: SpotAsset[] };
        futures_positions: { 
            count: number; 
            total_value: number; 
            unrealized_pnl: number; 
            positions: Position[] 
        };
    }>('/api/okx/portfolio'),
    
    // 통합 포트폴리오 (가상 + OKX)
    getCombinedPortfolio: () => fetchApi<CombinedPortfolio>('/api/portfolio/combined'),
    
    // 시그널 대기 큐
    getQueueStatus: () => fetchApi<QueueStatus>('/api/queue/status'),
    clearQueue: () => fetchApi<{ success: boolean; message: string }>('/api/queue/clear', { method: 'POST' }),
    processQueue: () => fetchApi<{ success: boolean; executed: number; message: string }>('/api/queue/process', { method: 'POST' }),

    // 포트폴리오 상태 (자동매매 대시보드용)
    getPortfolioStatus: () => fetchApi<PortfolioStatus>('/api/okx/portfolio-status'),
    
    // 잔고 최적화
    optimizeBalance: () => fetchApi<{
        total_equity: number;
        available_usdt: number;
        can_trade: boolean;
        transfer_made: boolean;
    }>('/api/okx/optimize-balance', { method: 'POST' }),

    // 봇 상태 조회
    getBotStatus: () => fetchApi<{
        bot_enabled: boolean;
        okx_connected: boolean;
        auto_trade_enabled: boolean;
        positions_count: number;
        okx_symbols_count: number;
    }>('/api/bot/status'),
    
    // 봇 On/Off 토글
    toggleBot: (enabled?: boolean) => fetchApi<{
        bot_enabled: boolean;
        message: string;
    }>('/api/bot/toggle', {
        method: 'POST',
        body: JSON.stringify(enabled !== undefined ? { enabled } : {}),
    }),
    
    // OKX 지원 심볼 목록
    getOKXSymbols: () => fetchApi<{
        count: number;
        symbols: Record<string, string>;
    }>('/api/okx/supported-symbols'),

    // 계좌 간 자금 이체
    transferFunds: (currency: string, amount: number, fromAccount: string, toAccount: string) =>
        fetchApi<{ success: boolean; transfer_id?: string; amount?: number }>('/api/okx/transfer-funds', {
            method: 'POST',
            body: JSON.stringify({ currency, amount, from_account: fromAccount, to_account: toAccount }),
        }),

    // 모든 OKX 계좌 잔고
    getAllBalances: () => fetchApi<{
        trading: { total_usdt: number; free_usdt: number; used_usdt: number };
        funding: { usdt: number; assets: any[] };
        spot_assets: any[];
        total_usdt: number;
        summary: { trading_total: number; trading_available: number; funding_usdt: number };
    }>('/api/okx/all-balances'),

    // ============== 로그 API ==============
    
    // 로그 조회
    getLogs: (limit: number = 100, level?: string) => fetchApi<LogEntry[]>(
        `/api/logs?limit=${limit}${level && level !== 'ALL' ? `&level=${level}` : ''}`
    ),
    
    // 로그 초기화
    clearLogs: () => fetchApi<{ message: string }>('/api/logs/clear', { method: 'POST' }),
};

// 로그 엔트리 인터페이스
export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    module?: string;
}

// 포트폴리오 상태 인터페이스
export interface PortfolioStatus {
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
        details?: any[];
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

// OKX 전체 상태 인터페이스
export interface OKXFullStatus {
    connected: boolean;
    enabled: boolean;
    auto_trade: boolean;
    auto_trade_enabled: boolean;
    is_demo: boolean;
    balance: {
        total_usdt: number;
        free_usdt: number;
        used_usdt: number;
    };
    positions: {
        symbol: string;
        side: string;
        size: number;
        notional_usd: number;
        entry_price: number;
        mark_price: number;
        pnl: number;
        pnl_percent: number;
        leverage: string;
    }[];
    stats: {
        daily_trades: number;
        daily_pnl: number;
        total_trades: number;
        total_pnl: number;
        winning_trades: number;
        losing_trades: number;
        positions_count: number;
        unrealized_pnl: number;
    };
    config: {
        leverage: number;
        position_size_percent: number;
        max_positions: number;
        min_confidence: number;
    };
    position_size_percent: number;
    max_position_size_usdt: number;
}

export default api;
