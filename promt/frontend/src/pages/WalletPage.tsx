import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet, Info, Coins } from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import type { Network } from '../store/walletStore';
import { formatCurrency } from '../utils/formatters';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DepositModal from '../components/features/DepositModal';
import WithdrawModal from '../components/features/WithdrawModal';
import { useTranslation } from '../hooks/useTranslation';
import { MockAPI } from '../api/mockServices';

const NETWORK_COLORS: Record<Network, string> = {
    TON: '#60A5FA',
    BSC: '#FBBF24',
    BNB: '#F0B429',
    TRC: '#FF5252',
    SOL: '#A78BFA',
    BTC: '#F59E0B',
    ETH: '#818CF8',
};

export default function WalletPage() {
    const { totalUsd, expectedDailyIncomeUsd, expectedDailyPercent, balances } = useWalletStore();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | null>(null);
    const [showListingPrompt, setShowListingPrompt] = useState(false);

    // Sync balance from backend on every page visit
    useEffect(() => {
        MockAPI.fetchBalance();
    }, []);

    const handleClose = () => {
        setActiveModal(null);
        // Re-sync after closing deposit/withdraw modal
        MockAPI.fetchBalance();
    };

    return (
        <>
            <div className="space-y-4 stagger-children">
                {/* Hero Balance Card */}
                <div className="glass-card-elevated rounded-2xl p-6 relative overflow-hidden">
                    {/* Radial glow behind balance */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-[#00E676]/[0.06] blur-[60px] rounded-full pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-[#64748B] text-sm mb-3">
                            <Wallet size={16} />
                            {t('wallet.availableBalance')}
                        </div>
                        <div className="text-4xl font-mono font-bold text-[#00E676] tracking-tight mb-4 text-shadow-green-strong">
                            ${formatCurrency(totalUsd).replace('$', '').replace('.', ',')} <span className="text-xl font-sans font-bold opacity-80">USD</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#00E676]/80 mb-6 font-medium">
                            <TrendingUp size={14} />
                            <span>{t('wallet.expectedDaily')} ${formatCurrency(expectedDailyIncomeUsd).replace('$', '').replace('.', ',')} ({expectedDailyPercent}%)</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setActiveModal('deposit')}
                                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E676] to-[#00C853] text-black rounded-2xl py-3.5 text-sm font-bold transition-all hover:brightness-110 active:scale-95 shadow-[0_4px_20px_rgba(0,230,118,0.25)]"
                            >
                                <ArrowDownLeft size={16} />
                                {t('wallet.deposit')}
                            </button>

                            <button
                                onClick={() => setShowListingPrompt(true)}
                                className="flex items-center justify-center gap-2 glass-card text-[#F8FAFC] rounded-2xl py-3.5 text-sm font-semibold transition-all hover:bg-white/[0.08] active:scale-95"
                            >
                                <ArrowUpRight size={16} />
                                {t('wallet.withdraw')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Networks Balance Card */}
                <div className="glass-card rounded-2xl p-5">
                    <h3 className="text-[13px] font-bold text-[#F8FAFC] mb-4 tracking-wide">{t('wallet.networkBalances')}</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(balances).map(([network, amount]) => (
                            <NetworkCard key={network} name={network as Network} amount={amount} />
                        ))}
                    </div>
                </div>

                {/* Info Cards Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="glass-card rounded-2xl p-5">
                        <div className="text-[#64748B] flex items-center gap-2 text-[13px] mb-3">
                            <div className="w-7 h-7 rounded-lg bg-[#00E676]/10 flex items-center justify-center">
                                <TrendingUp size={14} className="text-[#00E676]" />
                            </div>
                            {t('wallet.dailyProfit')}
                        </div>
                        <div className="text-2xl font-bold font-mono text-[#00E676] mb-3 text-shadow-green">{expectedDailyPercent}%</div>
                        <div className="text-[11px] text-[#64748B] leading-relaxed">
                            {t('wallet.dailyProfitDesc')}
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-5">
                        <div className="text-[#64748B] flex items-center gap-2 text-[13px] mb-3">
                            <div className="w-7 h-7 rounded-lg bg-[#60A5FA]/10 flex items-center justify-center">
                                <Info size={14} className="text-[#60A5FA]" />
                            </div>
                            {t('wallet.withdrawLimits')}
                        </div>
                        <div className="text-xl font-bold font-mono text-[#F8FAFC] mb-3">
                            $50 -<br />
                            $1,000
                        </div>
                    </div>
                </div>

                {/* Transactions History */}
                <div className="glass-card rounded-2xl p-5">
                    <h3 className="text-[13px] font-bold text-[#F8FAFC] mb-6 tracking-wide">{t('wallet.txHistory')}</h3>
                    <div className="space-y-2 pb-2">
                        {/* Skeleton placeholder */}
                        <div className="h-10 skeleton" />
                        <div className="h-10 skeleton opacity-60" />
                        <div className="h-10 skeleton opacity-30" />
                    </div>
                    <div className="text-center text-[12px] text-[#64748B] pt-2">
                        {t('wallet.noTx')}
                    </div>
                </div>
            </div>

            {activeModal === 'deposit' && <DepositModal onClose={handleClose} />}
            {activeModal === 'withdraw' && <WithdrawModal onClose={handleClose} />}

            {showListingPrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowListingPrompt(false)}>
                    <div className="glass-card-elevated rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-xl border border-[#30363D]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 text-[#00E676] font-bold mb-3">
                            <Coins size={22} />
                            {t('wallet.withdraw')}
                        </div>
                        <p className="text-[#E6EDF3] text-sm leading-relaxed mb-5">
                            {t('wallet.listingPromptMessage')}
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => { setShowListingPrompt(false); navigate('/exchange'); }}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E676] to-[#00C853] text-black rounded-xl py-3 text-sm font-bold"
                            >
                                <Coins size={16} />
                                {t('wallet.listingPromptExchange')}
                            </button>
                            <button
                                onClick={() => { setShowListingPrompt(false); setActiveModal('withdraw'); }}
                                className="w-full flex items-center justify-center gap-2 glass-card text-[#F8FAFC] rounded-xl py-3 text-sm font-semibold hover:bg-white/[0.08]"
                            >
                                <ArrowUpRight size={16} />
                                {t('wallet.listingPromptWithdrawAnyway')}
                            </button>
                            <button
                                onClick={() => setShowListingPrompt(false)}
                                className="w-full text-[#8B949E] text-sm py-2"
                            >
                                {t('withdraw.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function NetworkCard({ name, amount }: { name: Network, amount: number }) {
    const color = NETWORK_COLORS[name] || '#94A3B8';

    return (
        <div className="glass-card rounded-xl p-3.5 flex flex-col transition-all duration-200 hover:bg-white/[0.04] relative overflow-hidden group">
            {/* Color accent bar */}
            <div
                className="absolute top-0 left-3 right-3 h-[2px] rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: color }}
            />

            <div className="text-[10px] font-bold uppercase mt-1 mb-1.5 tracking-wider" style={{ color }}>
                {name}
            </div>
            <div className="text-sm font-mono font-bold text-[#F8FAFC] tracking-tight">
                ${amount.toFixed(2).replace('.', ',')} <span className="text-xs ml-0.5 font-sans text-[#64748B]">USDT</span>
            </div>
        </div>
    );
}
