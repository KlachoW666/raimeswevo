import { useState, useEffect } from 'react';
import { ArrowRightLeft, Wallet, Coins } from 'lucide-react';
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

    useEffect(() => {
        MockAPI.getZyphexRate().then((data) => {
            setRate(data.rate ?? 100);
            if (data.remaining != null && data.totalSupply != null) {
                setPool({ remaining: data.remaining, totalSupply: data.totalSupply, sold: data.sold ?? 0 });
            } else {
                setPool(null);
            }
        }).catch(() => setRate(100));
        MockAPI.getZyphexBalance().then(setZyphexData).catch(() => setZyphexData(null));
    }, []);

    const amount = parseFloat(amountUsdt) || 0;
    const amountZyphexPreview = amount > 0 ? Math.round(amount * rate * 1000) / 1000 : 0;
    const pricePerCoinUsd = rate > 0 ? 1 / rate : 0;
    const canExchange = amount >= 1 && amount <= totalUsd && !loading && rate > 0;

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
            const msg = e instanceof Error ? e.message : '';
            if (msg === 'insufficient_balance') setError(t('exchange.errorInsufficient'));
            else if (msg === 'supply_exhausted') setError(t('exchange.errorSupplyExhausted'));
            else if (msg === 'invalid_amount') setError(t('exchange.errorMin'));
            else if (msg === 'server_error') setError(t('exchange.errorServer'));
            else if (msg === 'user_not_found' || msg === 'not_authenticated') setError(t('exchange.errorSession'));
            else setError(t('exchange.errorNetwork'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="glass-card-elevated rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-[#00E676]/[0.06] blur-[60px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-[#64748B] text-sm mb-2">
                        <ArrowRightLeft size={16} />
                        {t('exchange.title')}
                    </div>
                    <div className="text-xs text-[#8B949E] mb-2">
                        {t('exchange.rateLabel')}: {t('exchange.rateDesc')} <span className="font-bold text-[#00E676]">{rate}</span> ZYPHEX
                    </div>
                    <div className="text-xs text-[#8B949E] mb-2">
                        {t('exchange.pricePerCoin')}: <span className="font-bold text-[#00E676]">${pricePerCoinUsd >= 0.0001 ? pricePerCoinUsd.toFixed(pricePerCoinUsd < 1 ? 4 : 2) : pricePerCoinUsd.toFixed(6)}</span>
                    </div>
                    {pool != null && (
                        <div className="mb-4">
                            <div className="text-xs text-[#8B949E] mb-1.5">
                                {t('exchange.poolRemainingFormat').replace('X', pool.remaining.toLocaleString()).replace('Y', pool.totalSupply.toLocaleString())}
                            </div>
                            <div className="h-2 bg-[#161B22] rounded-full overflow-hidden border border-[#30363D]">
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
                            className="w-full bg-[#161B22] border border-[#30363D] focus:border-[#00D26A]/50 rounded-xl py-3 px-4 text-white placeholder:text-[#8B949E] outline-none"
                        />
                    </div>
                    {amount > 0 && (
                        <div className="text-sm text-[#8B949E] mb-4">
                            {t('exchange.youGet')}: <span className="font-bold text-[#00E676]">{amountZyphexPreview.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ZYPHEX</span>
                        </div>
                    )}
                    {error && <div className="text-sm text-[#FF4444] mb-2">{error}</div>}
                    {successMsg && <div className="text-sm text-[#00E676] mb-2">{successMsg}</div>}
                    <button
                        onClick={handleExchange}
                        disabled={!canExchange}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E676] to-[#00C853] text-black rounded-2xl py-3.5 text-sm font-bold transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? '...' : t('exchange.exchangeBtn')}
                    </button>
                </div>
            </div>

            <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 text-[#F8FAFC] font-bold mb-3">
                    <Coins size={18} className="text-[#00E676]" />
                    {t('exchange.yourZyphex')}
                </div>
                <div className="text-2xl font-mono font-bold text-[#00E676] mb-4">
                    {(zyphexData?.balanceZyphex ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ZYPHEX
                </div>
                <div className="text-xs text-[#8B949E] mb-4">
                    Всего обменяно: ${(zyphexData?.totalExchangedUsdt ?? 0).toFixed(2)} USDT → {(zyphexData?.totalExchangedZyphex ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ZYPHEX
                </div>
                <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">{t('exchange.history')}</h4>
                {zyphexData?.history && zyphexData.history.length > 0 ? (
                    <ul className="space-y-2 max-h-40 overflow-y-auto thin-scrollbar">
                        {zyphexData.history.map((h, i) => (
                            <li key={i} className="flex justify-between text-xs bg-[#0D1117] rounded-lg px-3 py-2">
                                <span className="text-[#8B949E]">{h.createdAt.slice(0, 16).replace('T', ' ')}</span>
                                <span className="text-white">${h.amountUsdt.toFixed(2)} → <span className="text-[#00E676]">{h.amountZyphex.toLocaleString('en-US', { maximumFractionDigits: 2 })} ZYPHEX</span></span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-[#8B949E]">{t('exchange.noHistory')}</p>
                )}
            </div>
        </div>
    );
}
