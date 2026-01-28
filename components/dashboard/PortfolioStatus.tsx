"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { 
  Wallet, 
  TrendingUp, 
  Settings, 
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  PieChart,
  Shield
} from "lucide-react";

interface PortfolioData {
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

interface QueueData {
  queue_size: number;
  total_queued: number;
  total_executed: number;
  dynamic_info: {
    optimal_positions: number;
    current_positions: number;
    available_slots: number;
    position_size_usdt: number;
    total_balance: number;
  };
}

interface BotStatus {
  bot_enabled: boolean;
  okx_connected: boolean;
  auto_trade_enabled: boolean;
  positions_count: number;
  okx_symbols_count: number;
}

export function PortfolioStatus() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [queue, setQueue] = useState<QueueData | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      console.log("[PortfolioStatus] Fetching data...");
      const [portfolioRes, queueRes, botRes] = await Promise.all([
        api.getPortfolioStatus(),
        api.getQueueStatus(),
        api.getBotStatus()
      ]);
      
      console.log("[PortfolioStatus] Portfolio response:", portfolioRes);
      console.log("[PortfolioStatus] Queue response:", queueRes);
      console.log("[PortfolioStatus] Bot response:", botRes);
      
      if (portfolioRes.success && portfolioRes.data) {
        setPortfolio(portfolioRes.data);
      } else {
        console.warn("[PortfolioStatus] Portfolio fetch failed:", portfolioRes);
      }
      if (queueRes.success && queueRes.data) {
        setQueue(queueRes.data);
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
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      await api.optimizeBalance();
      await fetchData();
    } catch (error) {
      console.error("Optimize error:", error);
    } finally {
      setOptimizing(false);
    }
  };

  const handleBotToggle = async () => {
    setToggling(true);
    try {
      const res = await api.toggleBot();
      if (res.success) {
        await fetchData();
      }
    } catch (error) {
      console.error("Bot toggle error:", error);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-800 rounded w-2/3"></div>
          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="text-slate-400 text-center py-4">
          포트폴리오 정보를 불러올 수 없습니다
        </div>
      </div>
    );
  }

  const dynamicInfo = queue?.dynamic_info;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold text-white">실시간 포트폴리오</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* 봇 On/Off 토글 */}
          <button
            onClick={handleBotToggle}
            disabled={toggling}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              botStatus?.bot_enabled
                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50"
                : "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50"
            } ${toggling ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Zap className={`w-4 h-4 ${toggling ? "animate-pulse" : ""}`} />
            <span>봇 {botStatus?.bot_enabled ? "ON" : "OFF"}</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${
              botStatus?.bot_enabled ? "bg-green-500" : "bg-slate-600"
            }`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                botStatus?.bot_enabled ? "left-4" : "left-0.5"
              }`} />
            </div>
          </button>
          
          {portfolio.connected ? (
            <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
              <CheckCircle className="w-3 h-3" />
              {portfolio.is_demo ? "데모" : "실거래"}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
              <XCircle className="w-3 h-3" />
              연결안됨
            </span>
          )}
          <button
            onClick={fetchData}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 자산 개요 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Wallet className="w-3.5 h-3.5" />
              총 자산
            </div>
            <div className="text-lg font-bold text-white">
              ${(portfolio.balance?.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Zap className="w-3.5 h-3.5" />
              가용 USDT
            </div>
            <div className="text-lg font-bold text-green-400">
              ${(portfolio.balance?.available ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* 자동매매 상태 */}
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-800/40 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${portfolio.auto_trade_enabled ? 'text-green-400' : 'text-slate-500'}`} />
              <span className="text-sm font-medium text-white">자동매매</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${
              portfolio.auto_trade_enabled && portfolio.can_trade
                ? 'bg-green-500/20 text-green-400'
                : portfolio.auto_trade_enabled
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-slate-700 text-slate-400'
            }`}>
              {portfolio.auto_trade_enabled 
                ? (portfolio.can_trade ? '✅ 거래 가능' : '⏳ 대기 중')
                : '⏸️ 비활성화'
              }
            </span>
          </div>
          
          {dynamicInfo && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xl font-bold text-blue-400">{dynamicInfo.current_positions}</div>
                <div className="text-xs text-slate-400">현재 포지션</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-400">{dynamicInfo.available_slots}</div>
                <div className="text-xs text-slate-400">가용 슬롯</div>
              </div>
              <div>
                <div className="text-xl font-bold text-purple-400">${dynamicInfo.position_size_usdt.toFixed(2)}</div>
                <div className="text-xs text-slate-400">포지션당</div>
              </div>
            </div>
          )}
        </div>

        {/* 거래 설정 */}
        {portfolio.trading_config && (
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">거래 설정</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">레버리지</span>
                <span className="text-white font-medium">{portfolio.trading_config.leverage ?? 1}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">최소 신뢰도</span>
                <span className="text-white font-medium">{portfolio.trading_config.min_confidence ?? 70}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">포지션 비율</span>
                <span className="text-white font-medium">{portfolio.trading_config.position_size_percent ?? 10}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">최대 포지션</span>
                <span className="text-white font-medium">{portfolio.trading_config.max_positions ?? 10}개</span>
              </div>
            </div>
          </div>
        )}

        {/* 현물 보유 자산 */}
        {portfolio.holdings && portfolio.holdings.count > 0 && (
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">현물 보유</span>
              </div>
              <span className="text-sm text-slate-400">
                ${(portfolio.holdings.total_value ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="space-y-1">
              {(portfolio.holdings.details ?? []).slice(0, 3).map((asset) => (
                <div key={asset.currency} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{asset.currency}</span>
                    {asset.frozen > 0 && (
                      <span className="text-xs text-yellow-400">(잠김)</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-slate-300">{asset.total?.toFixed(4) ?? "0"}</span>
                    <span className="text-slate-500 ml-2">${asset.usd_value?.toFixed(2) ?? "0"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 시그널 큐 상태 */}
        {queue && queue.queue_size > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-300">대기 시그널</span>
              </div>
              <span className="text-lg font-bold text-blue-400">{queue.queue_size}개</span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              총 {queue.total_queued}개 큐잉 | {queue.total_executed}개 실행됨
            </div>
          </div>
        )}

        {/* 잔고 최적화 버튼 */}
        {portfolio.connected && !portfolio.can_trade && (portfolio.balance?.total ?? 0) > 10 && (
          <button
            onClick={handleOptimize}
            disabled={optimizing}
            className="w-full py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {optimizing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                최적화 중...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                잔고 최적화
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
