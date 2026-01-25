"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { 
    ChevronDown, 
    ChevronUp, 
    Save, 
    RotateCcw, 
    RefreshCw,
    Bell,
    Shield,
    Zap,
    Check,
    X
} from "lucide-react";

interface ConfigSectionProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function ConfigSection({ title, icon: Icon, children, defaultOpen = true }: ConfigSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-slate-800 rounded-lg overflow-hidden">
            <button
                className="flex items-center justify-between w-full px-4 py-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <h4 className="font-semibold text-slate-100">{title}</h4>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {isOpen && (
                <div className="p-4 space-y-3 border-t border-slate-800">
                    {children}
                </div>
            )}
        </div>
    );
}

interface ConfigItemProps {
    label: string;
    description?: string;
    children: React.ReactNode;
}

function ConfigItem({ label, description, children }: ConfigItemProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
            <div className="sm:w-1/2">
                <label className="block text-sm font-medium text-slate-200">{label}</label>
                {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
            </div>
            <div className="sm:w-1/2">
                {children}
            </div>
        </div>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                checked ? "bg-green-600" : "bg-slate-700"
            )}
            onClick={() => onChange(!checked)}
        >
            <span className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                checked ? "translate-x-4" : "translate-x-0.5"
            )} />
        </button>
    );
}

export function ConfigPanel() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingNotify, setTestingNotify] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // OKX 설정
    const [okxConfig, setOkxConfig] = useState({
        enabled: false,
        is_demo: true,
        leverage: 5,
        max_positions: 5,
        position_size: 20,
        auto_trade: false,
    });

    // 알림 설정
    const [notifyConfig, setNotifyConfig] = useState({
        enabled: false,
        telegram_chat_id: "",
        min_confidence: 70,
    });

    // 설정 로드
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const [okxRes, notifyRes] = await Promise.all([
                    api.getOKXConfig(),
                    api.getNotifyConfig()
                ]);

                if (okxRes.success && okxRes.data) {
                    setOkxConfig(prev => ({ ...prev, ...okxRes.data }));
                }
                if (notifyRes.success && notifyRes.data) {
                    setNotifyConfig(prev => ({ ...prev, ...notifyRes.data }));
                }
            } catch (error) {
                console.error("Config load error:", error);
            } finally {
                setLoading(false);
            }
        };

        loadConfig();
    }, []);

    // 설정 저장
    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const [okxRes, notifyRes] = await Promise.all([
                api.updateOKXConfig(okxConfig),
                api.updateNotifyConfig(notifyConfig)
            ]);

            if (okxRes.success && notifyRes.success) {
                setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
            } else {
                setMessage({ type: 'error', text: '일부 설정 저장에 실패했습니다.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: '설정 저장 중 오류가 발생했습니다.' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    // 알림 테스트
    const handleTestNotify = async () => {
        setTestingNotify(true);
        try {
            const response = await api.testNotify();
            if (response.success) {
                setMessage({ type: 'success', text: '테스트 메시지가 전송되었습니다.' });
            } else {
                setMessage({ type: 'error', text: '알림 전송에 실패했습니다. Chat ID를 확인하세요.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: '알림 테스트 중 오류가 발생했습니다.' });
        } finally {
            setTestingNotify(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                설정 로드 중...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto space-y-3 p-1">
            {/* Message */}
            {message && (
                <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded text-sm",
                    message.type === 'success' 
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                )}>
                    {message.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {message.text}
                </div>
            )}

            {/* OKX 거래 설정 */}
            <ConfigSection title="OKX 거래 설정" icon={Zap} defaultOpen>
                <ConfigItem label="자동매매 활성화" description="시그널 발생 시 자동으로 주문 실행">
                    <Toggle 
                        checked={okxConfig.enabled} 
                        onChange={(v) => setOkxConfig(prev => ({ ...prev, enabled: v }))} 
                    />
                </ConfigItem>
                
                <ConfigItem label="데모 모드" description="실제 자금 대신 모의 거래">
                    <Toggle 
                        checked={okxConfig.is_demo} 
                        onChange={(v) => setOkxConfig(prev => ({ ...prev, is_demo: v }))} 
                    />
                </ConfigItem>

                <ConfigItem label="자동 주문 실행" description="70%+ 시그널 자동 진입">
                    <Toggle 
                        checked={okxConfig.auto_trade} 
                        onChange={(v) => setOkxConfig(prev => ({ ...prev, auto_trade: v }))} 
                    />
                </ConfigItem>

                <ConfigItem label="레버리지" description="최대 레버리지 배수">
                    <input
                        type="number"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
                        value={okxConfig.leverage}
                        onChange={(e) => setOkxConfig(prev => ({ ...prev, leverage: parseInt(e.target.value) || 1 }))}
                        min={1}
                        max={100}
                    />
                </ConfigItem>

                <ConfigItem label="최대 포지션 수" description="동시에 유지할 최대 포지션">
                    <input
                        type="number"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
                        value={okxConfig.max_positions}
                        onChange={(e) => setOkxConfig(prev => ({ ...prev, max_positions: parseInt(e.target.value) || 1 }))}
                        min={1}
                        max={20}
                    />
                </ConfigItem>

                <ConfigItem label="포지션 크기 (USDT)" description="각 거래에 할당할 금액">
                    <input
                        type="number"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
                        value={okxConfig.position_size}
                        onChange={(e) => setOkxConfig(prev => ({ ...prev, position_size: parseFloat(e.target.value) || 10 }))}
                        min={5}
                        step={5}
                    />
                </ConfigItem>
            </ConfigSection>

            {/* 알림 설정 */}
            <ConfigSection title="텔레그램 알림" icon={Bell}>
                <ConfigItem label="알림 활성화" description="시그널 발생 시 텔레그램 알림">
                    <Toggle 
                        checked={notifyConfig.enabled} 
                        onChange={(v) => setNotifyConfig(prev => ({ ...prev, enabled: v }))} 
                    />
                </ConfigItem>

                <ConfigItem label="Chat ID" description="텔레그램 채팅 ID">
                    <input
                        type="text"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 font-mono"
                        value={notifyConfig.telegram_chat_id}
                        onChange={(e) => setNotifyConfig(prev => ({ ...prev, telegram_chat_id: e.target.value }))}
                        placeholder="@userinfobot으로 확인"
                    />
                </ConfigItem>

                <ConfigItem label="최소 신뢰도 (%)" description="알림 발송 기준 신뢰도">
                    <input
                        type="number"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
                        value={notifyConfig.min_confidence}
                        onChange={(e) => setNotifyConfig(prev => ({ ...prev, min_confidence: parseInt(e.target.value) || 70 }))}
                        min={50}
                        max={100}
                    />
                </ConfigItem>

                <button
                    className={cn(
                        "w-full mt-2 px-4 py-2 text-sm rounded flex items-center justify-center gap-2",
                        "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    )}
                    onClick={handleTestNotify}
                    disabled={testingNotify}
                >
                    {testingNotify ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <Bell className="w-4 h-4" />
                    )}
                    알림 테스트
                </button>
            </ConfigSection>

            {/* 저장 버튼 */}
            <div className="flex justify-end gap-2 pt-2">
                <button 
                    className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 flex items-center gap-2"
                    onClick={() => window.location.reload()}
                >
                    <RotateCcw className="w-4 h-4" />
                    초기화
                </button>
                <button 
                    className={cn(
                        "px-4 py-2 text-sm rounded flex items-center gap-2",
                        "bg-green-600 text-white hover:bg-green-500"
                    )}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    저장
                </button>
            </div>
        </div>
    );
}
