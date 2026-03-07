import { useState, useEffect } from 'react';
import { ArrowRightLeft, Wallet, Coins, Ticket } from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import { useTranslation } from '../hooks/useTranslation';
import { MockAPI } from '../api/mockServices';
import { formatCurrency } from '../utils/formatters';

type ZyphexBalance = {
    balanceZyphex: number;
    totalExchangedUsdt: number;
    totalExchangedZyphex: number;
    history: { amountUsdt: number; amountZyphex: number; rateUsed: number; createdAt: string }[];
} | null;

type PoolInfo = { remaining: number; totalSupply: number; sold: number } | null;

export default function ExchangePage() {
    const { totalUsd, setBalances, balances } = useWalletStore();
    const { t } = useTranslation();
    const [rate, setRate] = useState<number>(100);
    const [pool, setPool] = useState<PoolInfo>(null);
    const [zyphexData, setZyphexData] = useState<ZyphexBalance>(null);
    const [amountUsdt, setAmountUsdt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoError, setPromoError] = useState('');
    const [promoSuccess, setPromoSuccess] = useState('');

    const refreshRateAndPool = () => {
        MockAPI.getZyphexRate().then((data) => {
            setRate(data.rate ?? 100);
            if (data.remaining != null && data.totalSupply != null) {
                setPool({ remaining: data.remaining, totalSupply: data.totalSupply, sold: data.sold ?? 0 });
            } else {
                setPool(null);
            }
        }).catch(() => setRate(100));
    };

    useEffect(() => {
        refreshRateAndPool();
        MockAPI.getZyphexBalance().then(setZyphexData).catch(() => setZyphexData(null));
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            refreshRateAndPool();
            MockAPI.getZyphexBalance().then(setZyphexData).catch(() => {});
        }, 60_000);
        return () => clearInterval(interval);
    }, []);

    const amount = parseFloat(amountUsdt) || 0;
    const amountZyphexPreview = amount > 0 ? Math.round(amount * rate * 1000) / 1000 : 0;
    const pricePerCoinUsd = rate > 0 ? 1 / rate : 0;
    const canExchange = amount >= 1 && amount <= totalUsd && !loading && rate > 0;
    const balanceZyphex = zyphexData?.balanceZyphex ?? 0;
    const balanceUsdAtRate = rate > 0 ? balanceZyphex * pricePerCoinUsd : 0;

    const handleExchange = async () => {
        if (!canExchange) return;
        setError('');
        setSuccessMsg('');
        setLoading(true);
        try {
            await MockAPI.syncBalanceToServer();
            const result = await MockAPI.exchangeUsdtToZyphex(amount);
            const wallet = useWalletStore.getState();
            const oldTotal = wallet.totalUsd;
            const ratio = oldTotal > 0 ? result.newBalanceUsdt / oldTotal : 0;
            const newBalances = { ...wallet.balances };
            for (const k of Object.keys(newBalances) as (keyof typeof newBalances)[]) {
                newBalances[k] = Math.round(newBalances[k] * ratio * 100) / 100;
            }
            setBalances(result.newBalanceUsdt, newBalances);
            setAmountUsdt('');
            setSuccessMsg(t('exchange.success'));
            const [updated, rateData] = await Promise.all([MockAPI.getZyphexBalance(), MockAPI.getZyphexRate()]);
            setZyphexData(updated);
            setRate(rateData.rate ?? 100);
            if (rateData.remaining != null && rateData.totalSupply != null) {
                setPool({ remaining: rateData.remaining, totalSupply: rateData.totalSupply, sold: rateData.sold ?? 0 });
            }
        } catch (e: unknown) {
            const err = e instanceof Error ? e : null;
            const msg = err?.message ?? '';
            const detail = (err as Error & { detail?: string })?.detail;
            const status = (err as Error & { status?: number })?.status;
            const isServerDown = status === 502 || status === 503 || /Bad Gateway|Failed to fetch|NetworkError/i.test(msg);
            if (msg === 'insufficient_balance') setError(t('exchange.errorInsufficient'));
            else if (msg === 'supply_exhausted') setError(t('exchange.errorSupplyExhausted'));
            else if (msg === 'invalid_amount') setError(t('exchange.errorMin'));
            else if (msg === 'server_error') setError(detail ? `${t('exchange.errorServer')} (${detail})` : t('exchange.errorServer'));
            else if (msg === 'user_not_found' || msg === 'not_authenticated') setError(t('exchange.errorSession'));
            else if (isServerDown) setError(t('exchange.errorServerUnavailable'));
            else setError(detail ? `${t('exchange.errorNetwork')}: ${detail}` : t('exchange.errorNetwork'));
        } finally {
            setLoading(false);
        }
    };

    const handleActivatePromo = async () => {
        const code = promoCode.trim();
        if (!code) return;
        setPromoError('');
        setPromoSuccess('');
        setPromoLoading(true);
        try {
            const result = await MockAPI.activatePromo(code);
            setPromoSuccess(t('exchange.promoSuccess') + ` +${result.amountZyphex.toLocaleString('en-US', { maximumFractionDigits: 2 })} WEVOX`);
            setPromoCode('');
            const [updated, rateData] = await Promise.all([MockAPI.getZyphexBalance(), MockAPI.getZyphexRate()]);
            setZyphexData(updated);
            setRate(rateData.rate ?? 100);
            if (rateData.remaining != null && rateData.totalSupply != null) {
                setPool({ remaining: rateData.remaining, totalSupply: rateData.totalSupply, sold: rateData.sold ?? 0 });
            }
        } catch (e: unknown) {
            const err = e instanceof Error ? e : null;
            const msg = err?.message ?? '';
            if (msg === 'already_used') setPromoError(t('exchange.promoErrorAlreadyUsed'));
            else if (msg === 'invalid_code') setPromoError(t('exchange.promoErrorInvalid'));
            else if (msg === 'no_uses_left') setPromoError(t('exchange.promoErrorNoUses'));
            else if (msg === 'supply_exhausted') setPromoError(t('exchange.promoErrorSupply'));
            else if (msg === 'not_authenticated') setPromoError(t('exchange.errorSession'));
            else setPromoError(msg || t('exchange.errorNetwork'));
        } finally {
            setPromoLoading(false);
        }
    };

    return (
        <div className="space-y-5 stagger-children">
            <div className="surface-floating p-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-[#00E676]/[0.06] blur-[60px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-[#64748B] text-sm mb-2">
                        <ArrowRightLeft size={16} />
                        {t('exchange.title')}
                    </div>
                    <div className="text-xs text-[#8B949E] mb-2">
                        {t('exchange.rateLabel')}: {t('exchange.rateDesc')} <span className="font-bold text-[#00E676]">{rate}</span> WEVOX
                    </div>
                    <div className="text-xs text-[#8B949E] mb-2">
                        {t('exchange.pricePerCoin')}: <span className="font-bold text-[#00E676]">${pricePerCoinUsd >= 0.0001 ? pricePerCoinUsd.toFixed(pricePerCoinUsd < 1 ? 4 : 2) : pricePerCoinUsd.toFixed(6)}</span>
                    </div>
                    {pool != null && (
                        <div className="mb-4">
                            <div className="text-xs text-[#8B949E] mb-1.5">
                                {t('exchange.poolRemainingFormat').replace('X', pool.remaining.toLocaleString()).replace('Y', pool.totalSupply.toLocaleString())}
                            </div>
                            <div className="h-2 bg-[#111820] rounded-full overflow-hidden border border-white/[0.06]">
                                <div
                                    className="h-full bg-[#00E676]/60 rounded-full transition-all duration-300"
                                    style={{ width: `${(pool.remaining / pool.totalSupply) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-[#64748B] text-xs mb-2">
                        <Wallet size={14} />
                        {t('exchange.availableUsdt')}: <span className="font-bold text-white">{formatCurrency(totalUsd)}</span>
                    </div>
                    <div className="mb-4">
                        <label className="block text-xs text-[#8B949E] mb-1">{t('exchange.amountToExchange')}</label>
                        <input
                            type="number"
                            min={1}
                            step={0.01}
                            value={amountUsdt}
                            onChange={(e) => { setAmountUsdt(e.target.value); setError(''); setSuccessMsg(''); }}
                            placeholder="0"
                            className="w-full bg-[#111820] border border-white/[0.08] focus:border-[#00E676]/40 rounded-[14px] py-3 px-4 text-[#F1F5F9] placeholder:text-[#64748B] outline-none transition-colors"
                        />
                    </div>
                    {amount > 0 && (
                        <div className="text-sm text-[#8B949E] mb-4">
                            {t('exchange.youGet')}: <span className="font-bold text-[#00E676]">{amountZyphexPreview.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} WEVOX</span>
                        </div>
                    )}
                    {error && <div className="text-sm text-[#FF4444] mb-2">{error}</div>}
                    {successMsg && <div className="text-sm text-[#00E676] mb-2">{successMsg}</div>}
                    <button
                        onClick={handleExchange}
                        disabled={!canExchange}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? '...' : t('exchange.exchangeBtn')}
                    </button>
                </div>
            </div>

            <div className="bento-card p-5">
                <div className="flex items-center gap-2 text-[#64748B] text-sm mb-2">
                    <Ticket size={16} />
                    {t('exchange.promoTitle')}
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); setPromoSuccess(''); }}
                        placeholder={t('exchange.promoPlaceholder')}
                        className="flex-1 bg-[#111820] border border-white/[0.08] focus:border-[#00E676]/40 rounded-[14px] py-2.5 px-3 text-[#F1F5F9] placeholder:text-[#64748B] outline-none text-sm uppercase transition-colors"
                    />
                    <button
                        type="button"
                        onClick={handleActivatePromo}
                        disabled={!promoCode.trim() || promoLoading}
                        className="btn-secondary shrink-0 px-4 py-2.5 text-sm disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {promoLoading ? '...' : t('exchange.promoActivate')}
                    </button>
                </div>
                {promoError && <p className="text-xs text-[#FF4444] mt-2">{promoError}</p>}
                {promoSuccess && <p className="text-xs text-[#00E676] mt-2">{promoSuccess}</p>}
            </div>

            <div className="bento-card p-5">
                <div className="flex items-center gap-2 text-[#F1F5F9] font-bold mb-3">
                    <Coins size={18} className="text-[#00E676]" />
                    {t('exchange.yourZyphex')}
                </div>
                <div className="text-2xl font-mono font-bold text-[#00E676] mb-1">
                    {balanceZyphex.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} WEVOX
                </div>
                <div className="text-xs text-[#8B949E] mb-4">
                    ≈ ${balanceUsdAtRate >= 0.01 ? balanceUsdAtRate.toFixed(2) : balanceUsdAtRate.toFixed(4)} USDT ({t('exchange.balanceInUsdAtRate')})
                </div>
                <div className="text-xs text-[#8B949E] mb-4">
                    Всего обменяно: ${(zyphexData?.totalExchangedUsdt ?? 0).toFixed(2)} USDT → {(zyphexData?.totalExchangedZyphex ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} WEVOX
                    {rate > 0 && (zyphexData?.totalExchangedZyphex ?? 0) > 0 && (
                        <span className="block mt-0.5 text-[#64748B]">
                            ≈ ${((zyphexData?.totalExchangedZyphex ?? 0) * pricePerCoinUsd).toFixed(2)} USDT ({t('exchange.balanceInUsdAtRate')})
                        </span>
                    )}
                </div>
                <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">{t('exchange.history')}</h4>
                {zyphexData?.history && zyphexData.history.length > 0 ? (
                    <ul className="space-y-2 max-h-40 overflow-y-auto thin-scrollbar">
                        {zyphexData.history.map((h, i) => {
                            const usdAtRate = rate > 0 ? h.amountZyphex * pricePerCoinUsd : 0;
                            const usdLabel = usdAtRate >= 0.01 ? usdAtRate.toFixed(2) : usdAtRate.toFixed(4);
                            return (
                                <li key={i} className="flex justify-between text-xs surface-raised rounded-[10px] px-3 py-2">
                                    <span className="text-[#8B949E]">{h.createdAt.slice(0, 16).replace('T', ' ')}</span>
                                    <span className="text-white">
                                        {h.amountUsdt > 0 ? `$${h.amountUsdt.toFixed(2)} → ` : ''}
                                        <span className="text-[#00E676]">{h.amountZyphex.toLocaleString('en-US', { maximumFractionDigits: 2 })} WEVOX</span>
                                        {rate > 0 && <span className="text-[#8B949E] ml-1">(≈ ${usdLabel})</span>}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-xs text-[#8B949E]">{t('exchange.noHistory')}</p>
                )}
            </div>
        </div>
    );
}
