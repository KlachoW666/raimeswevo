import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';
import type { Network } from '../../store/walletStore';
import { MockAPI } from '../../api/mockServices';
import { useTelegram } from '../../hooks/useTelegram';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from '../../hooks/useTranslation';

const NETWORKS: Network[] = ['TON', 'BSC', 'BNB', 'TRC', 'SOL', 'BTC', 'ETH'];

export default function WithdrawModal({ onClose }: { onClose: () => void }) {
    const [activeNetwork, setActiveNetwork] = useState<Network>('TON');
    const [amount, setAmount] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { hapticFeedback, showAlert } = useTelegram();
    const { balances, withdrawLimits } = useWalletStore();
    const { t } = useTranslation();

    const handleMax = () => {
        const maxAvailable = Math.min(balances[activeNetwork], withdrawLimits.remainingToday);
        setAmount(maxAvailable.toString());
        hapticFeedback?.selectionChanged();
    };

    const handleSubmit = async () => {
        setError('');
        const numAmount = parseFloat(amount);

        if (isNaN(numAmount) || numAmount <= 0) {
            setError(t('withdraw.invalidAmount'));
            return;
        }

        if (!address) {
            setError(t('withdraw.invalidAddress'));
            return;
        }

        setLoading(true);
        try {
            const result = await MockAPI.requestWithdrawal(activeNetwork, numAmount, address);
            if (result.success) {
                hapticFeedback?.notificationOccurred('success');
                const msg = t('withdraw.success');
                if (showAlert) {
                    showAlert(msg);
                } else {
                    alert(msg);
                }
                onClose();
            } else {
                hapticFeedback?.notificationOccurred('error');
                setError(result.error || t('withdraw.error'));
            }
        } catch {
            setError(t('withdraw.networkError'));
        } finally {
            setLoading(false);
        }
    };

    const getAddressPlaceholder = (net: Network) => {
        switch (net) {
            case 'TON': return 'UQ... или EQ...';
            case 'BSC': case 'ETH': return '0x...';
            case 'TRC': return 'T...';
            case 'SOL': return 'Base58 адрес...';
            case 'BTC': return 'bc1... или 1...';
            default: return t('withdraw.addressPlaceholder');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col w-full h-full animate-slide-in-bottom" style={{ background: 'linear-gradient(180deg, #0B0F19 0%, #060A13 100%)' }}>

            {/* Header */}
            <div className="flex justify-between items-start px-5 pt-6 pb-4">
                <div>
                    <h3 className="text-[22px] font-bold text-[#F8FAFC] tracking-wide mb-1.5">
                        {t('withdraw.title')}
                    </h3>
                    <div className="text-[11px] font-semibold text-[#64748B] tracking-widest uppercase">
                        {NETWORKS.join(' · ')}
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl glass-card transition-all text-[#94A3B8] hover:text-white active:scale-90">
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-8 overflow-y-auto no-scrollbar flex-1 min-h-0 flex flex-col space-y-6">

                {/* Network Selector */}
                <div>
                    <div className="text-xs text-[#64748B] font-bold uppercase mb-2 tracking-wider">{t('withdraw.selectNetwork')}</div>
                    <div className="flex glass-card p-1 rounded-xl overflow-x-auto no-scrollbar">
                        {NETWORKS.map((net) => (
                            <button
                                key={net}
                                onClick={() => {
                                    setActiveNetwork(net);
                                    setError('');
                                    hapticFeedback?.selectionChanged();
                                }}
                                className={`flex-1 min-w-[60px] py-2 text-xs font-bold rounded-lg transition-all duration-200 ${activeNetwork === net
                                    ? 'bg-gradient-to-r from-[#00E676] to-[#00C853] text-black shadow-[0_2px_10px_rgba(0,230,118,0.2)]'
                                    : 'text-[#64748B] hover:text-[#94A3B8]'
                                    }`}
                            >
                                {net}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Amount Input */}
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <div className="text-xs text-[#64748B] font-bold uppercase tracking-wider">{t('withdraw.amountUsd')}</div>
                        <div className="text-[10px] text-[#64748B]">
                            {t('withdraw.available')} <span className="text-[#F8FAFC] font-mono">{formatCurrency(balances[activeNetwork])}</span>
                        </div>
                    </div>

                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                setError('');
                            }}
                            disabled={loading}
                            placeholder="0.00"
                            className="w-full glass-card border-white/[0.08] focus:border-[#00E676]/40 rounded-xl px-4 py-3.5 text-[#F8FAFC] font-mono text-xl focus:outline-none transition-all duration-200 disabled:opacity-40"
                        />
                        <button
                            onClick={handleMax}
                            disabled={loading}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#00E676] hover:text-white transition-all bg-[#00E676]/10 hover:bg-[#00E676]/20 px-2.5 py-1.5 rounded-lg"
                        >
                            {t('withdraw.max')}
                        </button>
                    </div>

                    <div className="flex justify-between items-center mt-2 px-1">
                        <div className="text-[10px] text-[#64748B]">
                            {t('withdraw.minMaxDaily').replace('${min}', withdrawLimits.minAmount.toString()).replace('${max}', withdrawLimits.maxDailyAmount.toString())}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                            {t('withdraw.remainingToday')} <span className="text-[#F8FAFC] font-mono">{formatCurrency(withdrawLimits.remainingToday)}</span>
                        </div>
                    </div>
                </div>

                {/* Wallet Address */}
                <div>
                    <div className="text-xs text-[#64748B] font-bold uppercase mb-2 tracking-wider">{t('withdraw.walletAddress')} ({activeNetwork})</div>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => {
                            setAddress(e.target.value);
                            setError('');
                        }}
                        disabled={loading}
                        placeholder={getAddressPlaceholder(activeNetwork)}
                        className="w-full glass-card border-white/[0.08] focus:border-[#00E676]/40 rounded-xl px-4 py-3.5 text-[#F8FAFC] font-mono text-sm focus:outline-none transition-all duration-200 disabled:opacity-40 placeholder:text-[#64748B]/30"
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="p-3 rounded-xl glass-card border-[#FF5252]/30 text-[#FF5252] text-xs font-semibold text-center glow-red animate-shake">
                        {error}
                    </div>
                )}

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="py-3.5 rounded-xl glass-card text-[#94A3B8] font-semibold transition-all hover:bg-white/[0.04] active:scale-95 disabled:opacity-40"
                    >
                        {t('withdraw.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !amount || !address}
                        className="py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-black font-bold active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 disabled:active:scale-100 shadow-[0_4px_20px_rgba(0,230,118,0.25)]"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : t('withdraw.withdrawBtn')}
                    </button>
                </div>

            </div>
        </div>
    );
}
