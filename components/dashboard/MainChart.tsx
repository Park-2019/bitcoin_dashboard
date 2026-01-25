"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, LineSeries, Time } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { api, AnalysisResult } from "@/lib/api";
import { ChevronDown, RefreshCw, TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";

interface Indicator {
    id: string;
    name: string;
    color: string;
    enabled: boolean;
}

interface MainChartProps {
    selectedSymbol?: string;
    onSymbolChange?: (symbol: string) => void;
}

export function MainChart({ selectedSymbol, onSymbolChange }: MainChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const sma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const sma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bbUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bbMiddleSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bbLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

    const [indicators, setIndicators] = useState<Indicator[]>([
        { id: "sma20", name: "MA20", color: "#22c55e", enabled: true },
        { id: "sma50", name: "MA50", color: "#3b82f6", enabled: false },
        { id: "bb", name: "BB", color: "#a855f7", enabled: true },
    ]);

    const timeframes = ["5m", "15m", "1H", "4H", "1D"];
    const pairs = ["BTC", "ETH", "SOL", "XRP", "DOGE", "PEPE", "AVAX", "LINK", "ADA", "DOT"];

    const [activeTimeframe, setActiveTimeframe] = useState("1H");
    const [activePair, setActivePair] = useState(selectedSymbol || "BTC");
    const [isPairDropdownOpen, setIsPairDropdownOpen] = useState(false);
    const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);

    // 외부에서 심볼이 선택되면 차트 업데이트
    useEffect(() => {
        if (selectedSymbol && selectedSymbol !== activePair) {
            setActivePair(selectedSymbol);
        }
    }, [selectedSymbol]);

    // 내부에서 심볼이 변경되면 외부에 알림
    const handlePairChange = (pair: string) => {
        setActivePair(pair);
        onSymbolChange?.(pair);
        setIsPairDropdownOpen(false);
    };

    // 지표 토글
    const toggleIndicator = (id: string) => {
        setIndicators(prev => prev.map(ind => 
            ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
        ));
    };

    // SMA 계산
    const calculateSMA = (data: any[], period: number) => {
        const smaData = [];
        for (let i = period - 1; i < data.length; i++) {
            const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
            smaData.push({ time: data[i].time, value: sum / period });
        }
        return smaData;
    };

    // 볼린저 밴드 계산
    const calculateBB = (data: any[], period: number, multiplier: number) => {
        const bbData = [];
        for (let i = period - 1; i < data.length; i++) {
            const slice = data.slice(i - period + 1, i + 1);
            const closes = slice.map(d => d.close);
            const sma = closes.reduce((a, b) => a + b, 0) / period;
            const stdDev = Math.sqrt(closes.map(x => Math.pow(x - sma, 2)).reduce((a, b) => a + b, 0) / period);
            bbData.push({
                time: data[i].time,
                upper: sma + stdDev * multiplier,
                middle: sma,
                lower: sma - stdDev * multiplier,
            });
        }
        return bbData;
    };

    // Mock 데이터 생성 (실제 API가 OHLCV를 반환하지 않으므로)
    const generateMockOHLCV = useCallback((symbol: string, basePrice: number) => {
        const data = [];
        let time = Math.floor(Date.now() / 1000) - 300 * 3600; // 300시간 전
        let price = basePrice;

        for (let i = 0; i < 300; i++) {
            const open = price;
            const change = (Math.random() - 0.48) * basePrice * 0.02;
            const close = price + change;
            const high = Math.max(open, close) + Math.random() * basePrice * 0.01;
            const low = Math.min(open, close) - Math.random() * basePrice * 0.01;

            data.push({
                time: time as Time,
                open,
                high,
                low,
                close,
            });

            time += 3600; // 1시간
            price = close;
        }
        return data;
    }, []);

    // 분석 데이터 가져오기
    const fetchAnalysis = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.analyze(activePair, activeTimeframe.toLowerCase());
            if (response.success && response.data) {
                setAnalysis(response.data);
                
                // Mock OHLCV 데이터 생성 (실제로는 API에서 가져와야 함)
                const basePrice = response.data.current_price || 40000;
                const mockData = generateMockOHLCV(activePair, basePrice);
                setChartData(mockData);
            }
        } catch (error) {
            console.error("Analysis fetch error:", error);
            // 에러 시에도 mock 데이터 사용
            const basePrices: Record<string, number> = {
                BTC: 42000, ETH: 2200, SOL: 100, XRP: 0.55, DOGE: 0.08, PEPE: 0.000001
            };
            const mockData = generateMockOHLCV(activePair, basePrices[activePair] || 100);
            setChartData(mockData);
        } finally {
            setLoading(false);
        }
    }, [activePair, activeTimeframe, generateMockOHLCV]);

    // 차트 초기화
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#94a3b8",
            },
            grid: {
                vertLines: { color: "#1e293b" },
                horzLines: { color: "#1e293b" },
            },
            width: chartContainerRef.current.clientWidth,
            height: 350,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: "#1e293b",
            },
        });

        chartRef.current = chart;

        // 캔들 시리즈
        candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
            upColor: "#22c55e",
            downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#22c55e",
            wickDownColor: "#ef4444",
        });

        // SMA 20
        sma20SeriesRef.current = chart.addSeries(LineSeries, {
            color: "#22c55e",
            lineWidth: 1,
        });

        // SMA 50
        sma50SeriesRef.current = chart.addSeries(LineSeries, {
            color: "#3b82f6",
            lineWidth: 1,
        });

        // 볼린저 밴드
        bbUpperSeriesRef.current = chart.addSeries(LineSeries, {
            color: "#a855f7",
            lineWidth: 1,
            lineStyle: 2,
        });
        bbMiddleSeriesRef.current = chart.addSeries(LineSeries, {
            color: "#a855f7",
            lineWidth: 1,
        });
        bbLowerSeriesRef.current = chart.addSeries(LineSeries, {
            color: "#a855f7",
            lineWidth: 1,
            lineStyle: 2,
        });

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, []);

    // 데이터 업데이트
    useEffect(() => {
        if (!chartData.length) return;

        candleSeriesRef.current?.setData(chartData);

        // SMA 20
        const sma20Enabled = indicators.find(i => i.id === "sma20")?.enabled;
        sma20SeriesRef.current?.setData(sma20Enabled ? calculateSMA(chartData, 20) : []);

        // SMA 50
        const sma50Enabled = indicators.find(i => i.id === "sma50")?.enabled;
        sma50SeriesRef.current?.setData(sma50Enabled ? calculateSMA(chartData, 50) : []);

        // 볼린저 밴드
        const bbEnabled = indicators.find(i => i.id === "bb")?.enabled;
        if (bbEnabled) {
            const bb = calculateBB(chartData, 20, 2);
            bbUpperSeriesRef.current?.setData(bb.map(d => ({ time: d.time, value: d.upper })));
            bbMiddleSeriesRef.current?.setData(bb.map(d => ({ time: d.time, value: d.middle })));
            bbLowerSeriesRef.current?.setData(bb.map(d => ({ time: d.time, value: d.lower })));
        } else {
            bbUpperSeriesRef.current?.setData([]);
            bbMiddleSeriesRef.current?.setData([]);
            bbLowerSeriesRef.current?.setData([]);
        }

        chartRef.current?.timeScale().fitContent();
    }, [chartData, indicators]);

    // 심볼/타임프레임 변경 시 데이터 가져오기
    useEffect(() => {
        fetchAnalysis();
    }, [fetchAnalysis]);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    {/* Pair Selector */}
                    <div className="relative">
                        <button
                            className="flex items-center gap-1 text-slate-100 hover:text-green-400 transition-colors"
                            onClick={() => setIsPairDropdownOpen(!isPairDropdownOpen)}
                        >
                            <span className="font-semibold text-lg">{activePair}/USDT</span>
                            <ChevronDown className={cn("w-4 h-4 transition-transform", isPairDropdownOpen && "rotate-180")} />
                        </button>
                        {isPairDropdownOpen && (
                            <div className="absolute z-20 mt-1 w-32 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {pairs.map((pair) => (
                                    <button
                                        key={pair}
                                        className={cn(
                                            "block w-full text-left px-4 py-2 text-sm hover:bg-slate-700",
                                            pair === activePair ? "text-green-400 bg-slate-700" : "text-slate-200"
                                        )}
                                        onClick={() => handlePairChange(pair)}
                                    >
                                        {pair}/USDT
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Timeframe Buttons */}
                    <div className="flex items-center gap-1">
                        {timeframes.map((tf) => (
                            <button
                                key={tf}
                                className={cn(
                                    "px-2 py-1 text-xs font-mono rounded",
                                    activeTimeframe === tf
                                        ? "bg-green-500/20 text-green-400"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                )}
                                onClick={() => setActiveTimeframe(tf)}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Indicator Toggles */}
                    {indicators.map((ind) => (
                        <button
                            key={ind.id}
                            className={cn(
                                "px-2 py-1 text-xs rounded border",
                                ind.enabled
                                    ? "border-transparent text-white"
                                    : "border-slate-700 text-slate-500 hover:text-slate-300"
                            )}
                            style={{ backgroundColor: ind.enabled ? ind.color + "33" : undefined }}
                            onClick={() => toggleIndicator(ind.id)}
                        >
                            {ind.name}
                        </button>
                    ))}

                    {/* Refresh */}
                    <button
                        className="p-1.5 text-slate-400 hover:text-slate-200"
                        onClick={fetchAnalysis}
                        disabled={loading}
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Analysis Summary (if available) */}
            {analysis && (
                <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-800 text-xs bg-slate-800/30">
                    <div className="flex items-center gap-1">
                        <span className="text-slate-500">현재가:</span>
                        <span className="font-mono text-slate-200">${analysis.current_price?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-slate-500">시장단계:</span>
                        <span className={cn(
                            "font-medium",
                            analysis.market_phase?.includes("상승") ? "text-green-400" :
                            analysis.market_phase?.includes("하락") ? "text-red-400" : "text-amber-400"
                        )}>
                            {analysis.market_phase || "--"}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500">진입적합도:</span>
                        <span className={cn(
                            "font-mono font-bold",
                            (analysis.entry_score || 0) >= 75 ? "text-green-400" :
                            (analysis.entry_score || 0) >= 60 ? "text-amber-400" : "text-slate-400"
                        )}>
                            {analysis.entry_score?.toFixed(0) || 0}%
                        </span>
                    </div>
                    {analysis.technical && (
                        <div className="flex items-center gap-1">
                            <span className="text-slate-500">RSI:</span>
                            <span className={cn(
                                "font-mono",
                                analysis.technical.rsi > 70 ? "text-red-400" :
                                analysis.technical.rsi < 30 ? "text-green-400" : "text-slate-300"
                            )}>
                                {analysis.technical.rsi?.toFixed(1)}
                            </span>
                        </div>
                    )}
                    {(analysis.bullish_signals?.length || 0) > 0 && (
                        <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">{analysis.bullish_signals?.length || 0}</span>
                        </div>
                    )}
                    {(analysis.bearish_signals?.length || 0) > 0 && (
                        <div className="flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-red-400" />
                            <span className="text-red-400">{analysis.bearish_signals?.length || 0}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Chart */}
            <div ref={chartContainerRef} className="w-full h-[350px]" />

            {/* Legend */}
            <div className="flex items-center justify-center gap-3 px-3 py-1 border-t border-slate-800 text-[10px]">
                <div className="flex items-center gap-1">
                    <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-green-500" />
                    <span className="text-slate-500">매수</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-red-500" />
                    <span className="text-slate-500">매도</span>
                </div>
                <div className="text-slate-700">|</div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-0.5 bg-green-500 rounded" />
                    <span className="text-slate-500">MA20</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-0.5 bg-purple-500 rounded" />
                    <span className="text-slate-500">BB</span>
                </div>
            </div>
        </div>
    );
}
