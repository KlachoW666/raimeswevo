import { useState, useEffect } from 'react';
import { Zap, Clock, Activity, Coins } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useTradeStore } from '../store/tradeStore';
import { CONFIG } from '../config';
import { MockAPI } from '../api/mockServices';

function useListingCountdown() {
    const [left, setLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
    useEffect(() => {
        const end = new Date(CONFIG.ZYPHEX_LISTING_DATE).getTime();
        const tick = () => {
            const now = Date.now();
            const diff = Math.max(0, end - now);
            if (diff === 0) {
                setLeft(null);
                return;
            }
            const d = Math.floor(diff / (24 * 60 * 60 * 1000));
            const h = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
            const s = Math.floor((diff % (60 * 1000)) / 1000);
            setLeft({ d, h, m, s });
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);
    return left;
}

export default function HomePage() {
    const { t } = useTranslation();
    const { trades, metrics } = useTradeStore();
    const countdown = useListingCountdown();
    const [zyphexRate, setZyphexRate] = useState<number | null>(null);
    useEffect(() => {
        MockAPI.getZyphexRate().then((r) => setZyphexRate(typeof r === 'object' && r && 'rate' in r ? r.rate : null)).catch(() => setZyphexRate(null));
    }, []);

    return (
        <div className="space-y-6 pb-4 stagger-children">
            {/* Trades Live Section */}
            <section>
                <div className="flex items-center gap-2.5 mb-3">
                    <h2 className="text-lg font-semibold text-[#F8FAFC]">{t('home.tradesLive')}</h2>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full glass-card text-[#00E676] text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse-dot" />
                        Live
                    </span>
                </div>
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 px-4 py-3 border-b border-white/[0.06] text-[10px] font-bold uppercase text-[#64748B] tracking-wider">
                        <span>{t('home.time')}</span>
                        <span>{t('home.pair')}</span>
                        <span>{t('home.pnl')}</span>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto thin-scrollbar">
                        {trades.length === 0 ? (
                            <div className="px-4 py-8 text-center text-[#64748B] text-sm">
                                {t('home.noTrades')}
                            </div>
                        ) : (
                            trades.map((trade, i) => (
                                <div
                                    key={trade.id}
                                    className={`grid grid-cols-[1fr_1fr_2fr] gap-2 px-4 py-2.5 border-b border-white/[0.04] last:border-0 text-sm transition-all duration-200 ${trade.type === 'profit'
                                            ? 'bg-gradient-to-r from-[#00E676]/[0.06] to-transparent'
                                            : 'bg-gradient-to-r from-[#FF5252]/[0.06] to-transparent'
                                        }`}
                                    style={{ animationDelay: `${i * 30}ms` }}
                                >
                                    <span className={`font-mono text-xs ${trade.type === 'profit' ? 'text-[#00E676]/60' : 'text-[#FF5252]/60'}`}>
                                        {trade.time}
                                    </span>
                                    <span className={`font-semibold ${trade.type === 'profit' ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                                        {trade.pair}
                                    </span>
                                    <span className={trade.type === 'profit' ? 'text-[#00E676]' : 'text-[#FF5252]'}>
                                        <span className="font-mono font-bold">{trade.pnl} {trade.pair}</span>
                                        <span className={`text-xs ml-1 ${trade.type === 'profit' ? 'text-[#00E676]/50' : 'text-[#FF5252]/50'}`}>
                                            {trade.pnlUsd}
                                        </span>
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Speed Section */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#00E676]/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-[#00E676]" />
                    </div>
                    <h2 className="text-lg font-semibold text-[#F8FAFC]">{t('home.speed')}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="glass-card rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-[#64748B] mb-2">
                            <div className="w-6 h-6 rounded-md bg-[#60A5FA]/10 flex items-center justify-center">
                                <Clock size={12} className="text-[#60A5FA]" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{t('home.delay')}</span>
                        </div>
                        <div className="text-[#F8FAFC] font-mono text-lg tabular-nums">~{metrics.latencyNs} {t('home.ns')}</div>
                        <div className="text-[10px] text-[#64748B] mt-1">{t('home.execSub')}</div>
                    </div>
                    <div className="glass-card rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-[#64748B] mb-2">
                            <div className="w-6 h-6 rounded-md bg-[#A78BFA]/10 flex items-center justify-center">
                                <Activity size={12} className="text-[#A78BFA]" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{t('home.executionsTitle')}</span>
                        </div>
                        <div className="text-[#F8FAFC] font-mono text-lg tabular-nums">{metrics.executionsSession}</div>
                        <div className="text-[10px] text-[#64748B] mt-1">{t('home.perSession')}</div>
                    </div>
                </div>
                <div className="mt-3 px-4 py-3 glass-card glow-green rounded-xl text-[#00E676] text-sm font-medium flex items-center justify-between">
                    <span>{t('home.avgSpeed')}</span>
                    <span className="font-mono text-shadow-green tabular-nums">~{metrics.avgExecutionNs} {t('home.ns')}</span>
                </div>
            </section>

            {/* ZYPHEX & Listing countdown */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#00E676]/10 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-[#00E676]" />
                    </div>
                    <h2 className="text-lg font-semibold text-[#F8FAFC]">{t('home.zyphexTitle')}</h2>
                </div>
                <div className="glass-card rounded-2xl p-5 space-y-4">
                    <p className="text-sm text-[#94A3B8] leading-relaxed">
                        {t('home.zyphexDesc')}
                    </p>
                    {zyphexRate != null && zyphexRate > 0 && (
                        <p className="text-sm text-[#00E676] font-medium">
                            {t('home.zyphexPriceLabel')}: 1 ZYPHEX = ${(1 / zyphexRate).toFixed((1 / zyphexRate) < 1 ? 4 : 2)}
                        </p>
                    )}
                    {countdown !== null && (
                        <div className="pt-3 border-t border-white/[0.06]">
                            <div className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider mb-2">
                                {t('home.listingCountdown')}
                            </div>
                            <div className="font-mono text-xl text-[#00E676] tabular-nums flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <span><span className="font-bold text-white">{countdown.d}</span> {t('home.daysShort')}</span>
                                <span><span className="font-bold text-white">{countdown.h}</span> {t('home.hoursShort')}</span>
                                <span><span className="font-bold text-white">{countdown.m}</span> {t('home.minsShort')}</span>
                                <span><span className="font-bold text-white">{countdown.s}</span> {t('home.secsShort')}</span>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
