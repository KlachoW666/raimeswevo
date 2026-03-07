import { useState, useEffect, memo } from 'react';
import { Zap, Clock, Activity, Coins, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useTradeStore } from '../store/tradeStore';
import type { Trade } from '../store/tradeStore';
import { CONFIG } from '../config';
import { MockAPI } from '../api/mockServices';
import { useWalletStore } from '../store/walletStore';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';

const TradeRow = memo(function TradeRow({ trade, index }: { trade: Trade; index: number }) {
  return (
    <div
      className={`grid grid-cols-[1fr_1fr_2fr] gap-2 px-4 py-2.5 border-b border-white/[0.04] last:border-0 text-sm transition-all duration-200 ${trade.type === 'profit'
        ? 'bg-gradient-to-r from-[#00E676]/[0.06] to-transparent'
        : 'bg-gradient-to-r from-[#FF5252]/[0.06] to-transparent'
        }`}
      style={{ animationDelay: `${index * 30}ms` }}
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
  );
});

export default function HomePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const trades = useTradeStore((s) => s.trades);
    const metrics = useTradeStore((s) => s.metrics);
    const isTradingActive = useTradeStore((s) => s.isTradingActive);
    const toggleTrading = useTradeStore((s) => s.toggleTrading);
    const boostEndTime = useTradeStore((s) => s.boostEndTime);
    const activateBoost = useTradeStore((s) => s.activateBoost);
    const totalUsd = useWalletStore((s) => s.totalUsd);
    const totalDeposited = useWalletStore((s) => s.totalDeposited);
    const [countdown, setCountdown] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
    const [boostTimeLeft, setBoostTimeLeft] = useState<string | null>(null);
    const [wevoxRate, setWevoxRate] = useState<number | null>(null);

    useEffect(() => {
        MockAPI.getZyphexRate().then((r) => setWevoxRate(typeof r === 'object' && r && 'rate' in r ? r.rate : null)).catch(() => setWevoxRate(null));
    }, []);

    useEffect(() => {
        const listingEnd = new Date(CONFIG.WEVOX_LISTING_DATE).getTime();
        const tick = () => {
            const now = Date.now();
            const listingDiff = Math.max(0, listingEnd - now);
            if (listingDiff === 0) {
                setCountdown(null);
            } else {
                setCountdown({
                    d: Math.floor(listingDiff / (24 * 60 * 60 * 1000)),
                    h: Math.floor((listingDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)),
                    m: Math.floor((listingDiff % (60 * 60 * 1000)) / (60 * 1000)),
                    s: Math.floor((listingDiff % (60 * 1000)) / 1000),
                });
            }
            if (boostEndTime && now < boostEndTime) {
                const diff = boostEndTime - now;
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setBoostTimeLeft(`${h}ч ${m}м ${s}с`);
            } else {
                setBoostTimeLeft(null);
            }
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [boostEndTime]);

    const isBoostActive = boostEndTime !== null && Date.now() < boostEndTime;

    return (
        <div className="space-y-5 pb-4 stagger-children">
            {/* Bento: Balance + quick actions | Boost | % per day */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2 bento-card p-4 flex flex-col justify-between min-h-[100px]">
                    <div className="flex items-center gap-2 text-[#64748B] text-xs font-semibold uppercase tracking-wider">
                        <Wallet size={14} />
                        Баланс
                    </div>
                    <div className="text-2xl font-bold text-[#00E676] font-mono tabular-nums mt-1 text-shadow-green">
                        {formatCurrency(totalUsd)}
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => navigate('/wallet')}
                            className="btn-primary flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm"
                        >
                            <ArrowDownLeft size={14} />
                            Пополнить
                        </button>
                        <button
                            onClick={() => navigate('/wallet')}
                            className="btn-secondary flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm"
                        >
                            <ArrowUpRight size={14} />
                            Вывести
                        </button>
                    </div>
                </div>
                <div className="bento-card p-4 flex flex-col">
                    <div className="flex items-center gap-1.5 text-[#64748B] mb-1">
                        <Zap size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Буст</span>
                    </div>
                    <p className="text-[10px] text-[#64748B] mb-2 leading-relaxed">10% на 3 ч</p>
                    <button
                        onClick={() => { if (!isBoostActive) activateBoost(); }}
                        disabled={isBoostActive}
                        className="mt-auto w-full py-2 rounded-[10px] text-xs font-semibold bg-[#00E676]/10 border border-[#00E676]/25 text-[#00E676] disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                        {isBoostActive ? boostTimeLeft ?? '…' : 'Включить'}
                    </button>
                </div>
                <div className="bento-card p-4 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 text-[#64748B] mb-1">
                        <Activity size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">В день</span>
                    </div>
                    <div className="text-xl font-bold text-[#00E676] font-mono">~{isBoostActive ? '10' : '5'}%</div>
                    <p className="text-[10px] text-[#64748B] mt-0.5">от торговли</p>
                </div>
            </div>

            {/* Trading toggle strip */}
            <div className="flex justify-between items-center px-1">
                <span className={`font-bold text-[13px] ${isTradingActive ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                    Торговля: {isTradingActive ? 'вкл' : 'выкл'}
                </span>
                <button
                    onClick={toggleTrading}
                    className="btn-secondary text-[12px] font-medium px-3 py-1.5"
                >
                    {isTradingActive ? 'Остановить' : 'Запустить'}
                </button>
            </div>

            {/* Trades block */}
            <section className="bento-card overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                    <span className="font-bold text-[#F1F5F9] text-[15px]">Сделки</span>
                </div>
                {totalUsd === 0 && totalDeposited === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-[#0F1419]/80 border-t border-white/[0.04]">
                        <h3 className="text-[#00E676] font-bold mb-2">Пополните баланс для торговли</h3>
                        <p className="text-[#94A3B8] text-xs mb-4">Баланс $0. Пополните счёт, чтобы начать.</p>
                        <button onClick={() => navigate('/wallet')} className="btn-primary py-2.5 px-6 text-sm">
                            Пополнить
                        </button>
                    </div>
                )}
                <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 px-4 py-3 border-b border-white/[0.06] text-[10px] font-bold uppercase text-[#64748B] tracking-wider">
                    <span>{t('home.time')}</span>
                    <span>{t('home.pair')}</span>
                    <span>{t('home.pnl')}</span>
                </div>
                <div className="max-h-[240px] overflow-y-auto thin-scrollbar">
                    {trades.length === 0 && (totalUsd > 0 || totalDeposited > 0) ? (
                        <div className="px-4 py-8 text-center text-[#64748B] text-sm">{t('home.noTrades')}</div>
                    ) : (
                        trades.map((trade, i) => <TradeRow key={trade.id} trade={trade} index={i} />)
                    )}
                </div>
            </section>

            {/* Speed: two stat-cards + strip */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-[10px] bg-[#00E676]/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-[#00E676]" />
                    </div>
                    <h2 className="text-base font-semibold text-[#F1F5F9]">{t('home.speed')}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="stat-card">
                        <div className="flex items-center gap-2 text-[#64748B] mb-2">
                            <div className="w-6 h-6 rounded-[8px] bg-[#60A5FA]/10 flex items-center justify-center">
                                <Clock size={12} className="text-[#60A5FA]" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{t('home.delay')}</span>
                        </div>
                        <div className="text-[#F1F5F9] font-mono text-lg tabular-nums">~{metrics.latencyNs} {t('home.ns')}</div>
                        <div className="text-[10px] text-[#64748B] mt-1">{t('home.execSub')}</div>
                    </div>
                    <div className="stat-card">
                        <div className="flex items-center gap-2 text-[#64748B] mb-2">
                            <div className="w-6 h-6 rounded-[8px] bg-[#A78BFA]/10 flex items-center justify-center">
                                <Activity size={12} className="text-[#A78BFA]" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{t('home.executionsTitle')}</span>
                        </div>
                        <div className="text-[#F1F5F9] font-mono text-lg tabular-nums">{metrics.executionsSession}</div>
                        <div className="text-[10px] text-[#64748B] mt-1">{t('home.perSession')}</div>
                    </div>
                </div>
                <div className="mt-3 px-4 py-3 surface-raised glow-green rounded-[14px] text-[#00E676] text-sm font-medium flex items-center justify-between">
                    <span>{t('home.avgSpeed')}</span>
                    <span className="font-mono text-shadow-green tabular-nums">~{metrics.avgExecutionNs} {t('home.ns')}</span>
                </div>
            </section>

            {/* WEVOX + listing countdown */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-[10px] bg-[#00E676]/10 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-[#00E676]" />
                    </div>
                    <h2 className="text-base font-semibold text-[#F1F5F9]">{t('home.wevoxTitle')}</h2>
                </div>
                <div className="bento-card p-5 space-y-4">
                    <p className="text-sm text-[#94A3B8] leading-relaxed">{t('home.wevoxDesc')}</p>
                    {wevoxRate != null && wevoxRate > 0 && (
                        <p className="text-sm text-[#00E676] font-medium">
                            {t('home.wevoxPriceLabel')}: 1 WEVOX = ${(1 / wevoxRate).toFixed((1 / wevoxRate) < 1 ? 4 : 2)}
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
