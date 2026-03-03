import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet, Info } from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import type { Network } from '../store/walletStore';
import { formatCurrency } from '../utils/formatters';
import { useState, useEffect } from 'react';
import DepositModal from '../components/features/DepositModal';
import WithdrawModal from '../components/features/WithdrawModal';
import { useTranslation } from '../hooks/useTranslation';
import { MockAPI } from '../api/mockServices';

export default function WalletPage() {
    const { totalUsd, expectedDailyIncomeUsd, expectedDailyPercent, balances } = useWalletStore();
    const { t } = useTranslation();

    const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | null>(null);

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
            <div className="space-y-4">
                {/* Top Balance Card */}
                <div className="bg-[#1C2333]/30 border border-[#30363D]/50 rounded-2xl p-5">
                    <div className="flex items-center gap-2 text-[#8B949E] text-sm mb-3">
                        <Wallet size={16} />
                        {t('wallet.availableBalance')}
                    </div>
                    <div className="text-3xl font-mono font-bold text-[#00D26A] tracking-tight mb-4">
                        ${formatCurrency(totalUsd).replace('$', '').replace('.', ',')} <span className="text-xl font-sans font-bold">USD</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#00D26A] mb-6 font-medium">
                        <TrendingUp size={14} />
                        <span>{t('wallet.expectedDaily')} ~${formatCurrency(expectedDailyIncomeUsd).replace('$', '').replace('.', ',')} (~{expectedDailyPercent}%)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setActiveModal('deposit')}
                            className="flex items-center justify-center gap-2 bg-transparent border border-[#00D26A]/50 text-[#00D26A] rounded-xl py-3 text-sm font-semibold transition-all hover:bg-[#00D26A]/10 active:scale-95"
                        >
                            <ArrowDownLeft size={16} />
                            {t('wallet.deposit')}
                        </button>

                        <button
                            onClick={() => setActiveModal('withdraw')}
                            className="flex items-center justify-center gap-2 bg-[#1C2333] border border-transparent text-white rounded-xl py-3 text-sm font-semibold transition-all hover:bg-[#1C2333]/80 active:scale-95"
                        >
                            <ArrowUpRight size={16} />
                            {t('wallet.withdraw')}
                        </button>
                    </div>
                </div>

                {/* Networks Balance Card */}
                <div className="bg-[#1C2333]/30 border border-[#30363D]/50 rounded-2xl p-5">
                    <h3 className="text-[13px] font-bold text-white mb-4 tracking-wide">{t('wallet.networkBalances')}</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(balances).map(([network, amount]) => (
                            <NetworkCard key={network} name={network as Network} amount={amount} />
                        ))}
                    </div>
                </div>

                {/* Info Cards Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1C2333]/30 border border-[#30363D]/50 rounded-2xl p-5">
                        <div className="text-[#8B949E] flex items-center gap-2 text-[13px] mb-3">
                            <TrendingUp size={16} />
                            {t('wallet.dailyProfit')}
                        </div>
                        <div className="text-2xl font-bold font-mono text-[#00D26A] mb-3">~5%</div>
                        <div className="text-[11px] text-[#8B949E] leading-relaxed opacity-80">
                            {t('wallet.dailyProfitDesc')}
                        </div>
                    </div>

                    <div className="bg-[#1C2333]/30 border border-[#30363D]/50 rounded-2xl p-5">
                        <div className="text-[#8B949E] flex items-center gap-2 text-[13px] mb-3">
                            <Info size={16} />
                            {t('wallet.withdrawLimits')}
                        </div>
                        <div className="text-xl font-bold font-mono text-white mb-3">
                            $50 -<br />
                            $1,000
                        </div>
                    </div>
                </div>

                {/* Transactions History */}
                <div className="bg-[#1C2333]/30 border border-[#30363D]/50 rounded-2xl p-5">
                    <h3 className="text-[13px] font-bold text-white mb-8 tracking-wide">{t('wallet.txHistory')}</h3>
                    <div className="text-center text-[13px] text-[#8B949E] opacity-70 pb-6 leading-relaxed">
                        {t('wallet.noTx')}
                    </div>
                </div>
            </div>

            {activeModal === 'deposit' && <DepositModal onClose={handleClose} />}
            {activeModal === 'withdraw' && <WithdrawModal onClose={handleClose} />}
        </>
    );
}

function NetworkCard({ name, amount }: { name: Network, amount: number }) {
    return (
        <div className="bg-[#161B22]/50 rounded-xl p-3 flex flex-col transition-colors">
            <div className="text-[10px] text-[#8B949E] font-medium uppercase mb-1">{name}</div>
            <div className="text-sm font-mono font-bold text-white tracking-tight">${amount.toFixed(2).replace('.', ',')} <span className="text-xs ml-1 font-sans">USDT</span></div>
        </div>
    );
}
