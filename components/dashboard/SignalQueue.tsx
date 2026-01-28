'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, QueueStatus } from '@/lib/api';

export default function SignalQueue() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchQueueStatus = useCallback(async () => {
    try {
      const response = await api.getQueueStatus();
      if (response.success && response.data) {
        setQueueStatus(response.data);
        setError(null);
      } else {
        setError(response.error || '큐 상태 조회 실패');
      }
    } catch (err) {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchQueueStatus]);

  const handleClearQueue = async () => {
    if (!confirm('정말 대기 큐를 모두 비우시겠습니까?')) return;
    
    const response = await api.clearQueue();
    if (response.success) {
      fetchQueueStatus();
    }
  };

  const handleProcessQueue = async () => {
    setProcessing(true);
    try {
      const response = await api.processQueue();
      if (response.success) {
        fetchQueueStatus();
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-zinc-800 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/80 border border-red-900/50 rounded-xl p-4">
        <h3 className="text-red-400 font-medium mb-2">⚠️ 시그널 큐 오류</h3>
        <p className="text-sm text-zinc-500">{error}</p>
      </div>
    );
  }

  if (!queueStatus) return null;

  const { queue_size, max_queue_size, total_queued, total_executed, total_expired, top_signals, dynamic_info } = queueStatus;
  const usagePercent = (queue_size / max_queue_size) * 100;

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-semibold text-white">시그널 대기 큐</h3>
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            queue_size > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700/50 text-zinc-400'
          }`}>
            {queue_size}개 대기
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleProcessQueue}
            disabled={processing || queue_size === 0}
            className="px-3 py-1 text-xs bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {processing ? '처리중...' : '수동 실행'}
          </button>
          <button
            onClick={handleClearQueue}
            disabled={queue_size === 0}
            className="px-3 py-1 text-xs bg-zinc-700/50 text-zinc-400 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 큐 상태 게이지 */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>큐 사용량</span>
          <span>{queue_size} / {max_queue_size}</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-emerald-400">{total_executed}</div>
          <div className="text-xs text-zinc-500">실행됨</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-amber-400">{total_queued}</div>
          <div className="text-xs text-zinc-500">총 대기</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-red-400">{total_expired}</div>
          <div className="text-xs text-zinc-500">만료됨</div>
        </div>
      </div>

      {/* 동적 포지션 정보 */}
      {dynamic_info && (
        <div className="bg-zinc-800/30 rounded-lg p-3 mb-4">
          <div className="text-xs text-zinc-400 mb-2">💰 동적 포지션 관리</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">총 잔고</span>
              <span className="text-white">${dynamic_info.total_balance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">최적 포지션 수</span>
              <span className="text-white">{dynamic_info.optimal_positions}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">현재 포지션</span>
              <span className="text-white">{dynamic_info.current_positions}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">가용 슬롯</span>
              <span className={dynamic_info.available_slots > 0 ? 'text-emerald-400' : 'text-red-400'}>
                {dynamic_info.available_slots}개
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">포지션 크기</span>
              <span className="text-white">${dynamic_info.position_size_usdt.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">자동 거래</span>
              <span className={dynamic_info.auto_trade_enabled ? 'text-emerald-400' : 'text-zinc-500'}>
                {dynamic_info.auto_trade_enabled ? '활성화' : '비활성화'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 대기 시그널 목록 */}
      {top_signals && top_signals.length > 0 ? (
        <div>
          <div className="text-xs text-zinc-400 mb-2">🎯 대기 중인 시그널 (신뢰도순)</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {top_signals.map((signal, idx) => (
              <div
                key={`${signal.symbol}-${idx}`}
                className="flex items-center justify-between bg-zinc-800/40 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                    idx === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700/50 text-zinc-400'
                  }`}>
                    #{idx + 1}
                  </span>
                  <span className="font-medium text-white">{signal.symbol}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-emerald-400">{signal.confidence.toFixed(1)}%</div>
                    <div className="text-xs text-zinc-500">신뢰도</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    signal.confidence >= 90 ? 'bg-emerald-500' :
                    signal.confidence >= 80 ? 'bg-amber-500' :
                    'bg-orange-500'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-zinc-500 text-sm py-4">
          대기 중인 시그널이 없습니다
        </div>
      )}

      {/* 설명 */}
      <div className="mt-4 pt-3 border-t border-zinc-800">
        <div className="text-xs text-zinc-500">
          💡 신뢰도가 높은 시그널이 우선 실행됩니다. 포지션 슬롯이 비면 자동으로 다음 시그널이 진입합니다.
        </div>
      </div>
    </div>
  );
}
