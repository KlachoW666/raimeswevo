import { useEffect, useRef } from 'react';
import { Zap, Clock, Activity } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useTradeStore, type Trade } from '../store/tradeStore';

const LIVE_PAIRS = ['BONK', 'FIL', 'ETH', 'KAS', 'ROSE', 'SUI', 'VET', 'ALGO', 'LINK', 'APT', 'BNB', 'ATOM', 'AAVE', 'LTC', 'XRP', 'DOGE', 'SOL', 'ARB', 'OP'];
const uid = () => Math.random().toString(36).slice(2, 10);

function formatTime() {
    const d = new Date();
    return d.toTimeString().slice(0, 8); // HH:MM:SS
}

function randomTrade(winratePercent: number): Trade {
    const pair = LIVE_PAIRS[Math.floor(Math.random() * LIVE_PAIRS.length)];
    const isProfit = Math.random() * 100 < winratePercent;
    const pnlAbs = Math.random() * 2 + 0.01;
    const pnlUsdAbs = Math.random() * 1.5 + 0.001;
    const pnl = isProfit ? `+${pnlAbs.toFixed(4)}` : `-${pnlAbs.toFixed(4)}`;
    const pnlUsd = isProfit ? `($${pnlUsdAbs.toFixed(4)})` : `($-${pnlUsdAbs.toFixed(4)})`;
    return {
        id: `live_${uid()}`,
        time: formatTime(),
        pair,
        pnl,
        pnlUsd,
        type: isProfit ? 'profit' : 'loss',
    };
}

const UPDATE_INTERVAL_MS = 800; // ~1.25 updates per second for live feel

export default function HomePage() {
    const { t } = useTranslation();
    const { trades, metrics, addTrade, incrementExecutions, updateMetrics, globalWinrate } = useTradeStore();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            const trade = randomTrade(globalWinrate);
            addTrade(trade);
            incrementExecutions();
            const baseLatency = 780 + Math.floor(Math.random() * 60);
            const baseAvg = baseLatency + Math.floor(Math.random() * 30);
            updateMetrics({
                latencyNs: baseLatency,
                avgExecutionNs: baseAvg,
            });
        }, UPDATE_INTERVAL_MS);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [addTrade, incrementExecutions, updateMetrics, globalWinrate]);

    return (
        <div className="space-y-6 pb-4">
            {/* Сделки + Live */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-lg font-semibold text-white">{t('home.tradesLive')}</h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00D26A]/20 text-[#00D26A] text-xs font-semibold animate-pulse">
                        Live
                    </span>
                </div>
                <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 px-4 py-3 border-b border-[#30363D] text-[10px] font-bold uppercase text-[#8B949E] tracking-wider">
                        <span>{t('home.time')}</span>
                        <span>{t('home.pair')}</span>
                        <span>{t('home.pnl')}</span>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto">
                        {trades.length === 0 ? (
                            <div className="px-4 py-8 text-center text-[#8B949E] text-sm">
                                {t('home.noTrades')}
                            </div>
                        ) : (
                            trades.map((trade) => (
                                <div
                                    key={trade.id}
                                    className={`grid grid-cols-[1fr_1fr_2fr] gap-2 px-4 py-2.5 border-b border-[#30363D]/50 last:border-0 text-sm border-l-2 transition-colors ${trade.type === 'profit'
                                            ? 'bg-[#00D26A]/[0.06] border-l-[#00D26A]'
                                            : 'bg-[#FF4444]/[0.06] border-l-[#FF4444]'
                                        }`}
                                >
                                    <span className={`font-mono text-xs ${trade.type === 'profit' ? 'text-[#00D26A]/70' : 'text-[#FF4444]/70'}`}>{trade.time}</span>
                                    <span className={`font-semibold ${trade.type === 'profit' ? 'text-[#00D26A]' : 'text-[#FF4444]'}`}>{trade.pair}</span>
                                    <span className={trade.type === 'profit' ? 'text-[#00D26A]' : 'text-[#FF4444]'}>
                                        <span className="font-mono font-bold">{trade.pnl} {trade.pair}</span>
                                        <span className={`text-xs ml-1 ${trade.type === 'profit' ? 'text-[#00D26A]/60' : 'text-[#FF4444]/60'}`}>{trade.pnlUsd}</span>
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Скорость */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-[#00D26A]" />
                    <h2 className="text-lg font-semibold text-white">{t('home.speed')}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-[#8B949E] mb-1">
                            <Clock size={14} />
                            <span className="text-xs font-bold uppercase">{t('home.delay')}</span>
                        </div>
                        <div className="text-white font-mono text-lg">~{metrics.latencyNs} {t('home.ns')}</div>
                        <div className="text-[10px] text-[#8B949E] mt-1">{t('home.execSub')}</div>
                    </div>
                    <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-[#8B949E] mb-1">
                            <Activity size={14} />
                            <span className="text-xs font-bold uppercase">{t('home.executionsTitle')}</span>
                        </div>
                        <div className="text-white font-mono text-lg">{metrics.executionsSession}</div>
                        <div className="text-[10px] text-[#8B949E] mt-1">{t('home.perSession')}</div>
                    </div>
                </div>
                <div className="mt-3 px-4 py-2.5 bg-[#00D26A]/10 border border-[#00D26A]/30 rounded-xl text-[#00D26A] text-sm font-medium flex items-center justify-between">
                    <span>{t('home.avgSpeed')}</span>
                    <span className="font-mono">~{metrics.avgExecutionNs} {t('home.ns')}</span>
                </div>
            </section>
        </div>
    );
}
