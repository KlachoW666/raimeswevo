import { useAdminStore, ALL_PAIRS } from '../../store/adminStore';
import { useTradeStore } from '../../store/tradeStore';
import { useTelegram } from '../../hooks/useTelegram';
import { Settings, Zap, Clock, BarChart3 } from 'lucide-react';

export default function AdminTradeSettings() {
    const { settings, updateSettings, togglePair, addAuditEntry } = useAdminStore();
    const { globalWinrate, setGlobalWinrate, tradeDelayMs, setTradeDelayMs } = useTradeStore();
    const { hapticFeedback } = useTelegram();

    const handleWinrateChange = (mode: 'safe' | 'balanced' | 'aggressive', val: number) => {
        const newModes = { ...settings.winrateByMode, [mode]: val };
        updateSettings({ winrateByMode: newModes });
        addAuditEntry({ adminId: 'admin', action: 'Винрейт по режиму', details: `${mode}: ${val}%` });
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Global Settings */}
            <div className="bento-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Settings size={16} className="text-[#00E676]" />
                    <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">Глобальные параметры</h4>
                </div>

                <div className="space-y-4">
                    <SliderRow
                        label="Глобальный винрейт"
                        value={globalWinrate}
                        min={0}
                        max={100}
                        suffix="%"
                        onChange={(v) => {
                            setGlobalWinrate(v);
                            hapticFeedback?.selectionChanged();
                        }}
                    />
                    <SliderRow
                        label="Задержка сделок"
                        value={tradeDelayMs}
                        min={100}
                        max={5000}
                        step={100}
                        suffix="ms"
                        onChange={(v) => {
                            setTradeDelayMs(v);
                            hapticFeedback?.selectionChanged();
                        }}
                    />
                    <SliderRow
                        label="Дневная прибыль"
                        value={settings.dailyProfitPercent}
                        min={1}
                        max={15}
                        suffix="%"
                        onChange={v => updateSettings({ dailyProfitPercent: v })}
                    />
                    <SliderRow
                        label="Макс пар одновременно"
                        value={settings.maxConcurrentPairs}
                        min={1}
                        max={50}
                        onChange={v => updateSettings({ maxConcurrentPairs: v })}
                    />
                </div>
            </div>

            {/* Winrate by Mode */}
            <div className="bento-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={16} className="text-[#58A6FF]" />
                    <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">Винрейт по режимам</h4>
                </div>
                <div className="space-y-4">
                    <SliderRow label="🛡️ Безопасный" value={settings.winrateByMode.safe} min={0} max={100} suffix="%" onChange={v => handleWinrateChange('safe', v)} />
                    <SliderRow label="⚖️ Баланс" value={settings.winrateByMode.balanced} min={0} max={100} suffix="%" onChange={v => handleWinrateChange('balanced', v)} />
                    <SliderRow label="🔥 Агрессивный" value={settings.winrateByMode.aggressive} min={0} max={100} suffix="%" onChange={v => handleWinrateChange('aggressive', v)} />
                </div>
            </div>

            {/* Trading Schedule */}
            <div className="bento-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Clock size={16} className="text-[#F0883E]" />
                    <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">Расписание торговли</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] text-[#8B949E] mb-1 block">Начало</label>
                        <input
                            type="time"
                            value={settings.tradingSchedule.start}
                            onChange={e => updateSettings({ tradingSchedule: { ...settings.tradingSchedule, start: e.target.value } })}
                            className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#00E676] transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-[#8B949E] mb-1 block">Конец</label>
                        <input
                            type="time"
                            value={settings.tradingSchedule.end}
                            onChange={e => updateSettings({ tradingSchedule: { ...settings.tradingSchedule, end: e.target.value } })}
                            className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#00E676] transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Trading Pairs */}
            <div className="bento-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Zap size={16} className="text-[#F778BA]" />
                        <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">Торговые пары</h4>
                    </div>
                    <span className="text-[10px] text-[#8B949E]">{settings.enabledPairs.length}/{ALL_PAIRS.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {ALL_PAIRS.map(pair => {
                        const enabled = settings.enabledPairs.includes(pair);
                        return (
                            <button
                                key={pair}
                                onClick={() => {
                                    togglePair(pair);
                                    hapticFeedback?.selectionChanged();
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${enabled ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30' : 'bg-[#0D1117] text-[#8B949E]/50 border border-[#30363D]/30'}`}
                            >
                                {pair}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function SliderRow({ label, value, min, max, step = 1, suffix = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-[#8B949E]">{label}</span>
                <span className="text-sm font-bold text-[#00E676] font-mono">{value}{suffix}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-1.5 bg-[#30363D] rounded-full appearance-none cursor-pointer accent-[#00E676]"
            />
        </div>
    );
}
