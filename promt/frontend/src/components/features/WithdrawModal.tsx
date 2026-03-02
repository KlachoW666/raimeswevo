import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';
import type { Network } from '../../store/walletStore';
import { MockAPI } from '../../api/mockServices';
import { useTelegram } from '../../hooks/useTelegram';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from '../../hooks/useTranslation';

const NETWORKS: Network[] = ['TON', 'BSC', 'TRC', 'SOL', 'BTC', 'ETH'];

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
        <div className="fixed inset-0 z-50 bg-[#1C2333] flex flex-col w-full h-full animate-in slide-in-from-bottom duration-300">

            {/* Header */}
            <div className="flex justify-between items-start px-5 pt-6 pb-4">
                <div>
                    <h3 className="text-[22px] font-bold text-white tracking-wide mb-1.5 shadow-sm">
                        {t('withdraw.title')}
                    </h3>
                    <div className="text-[11px] font-semibold text-[#8B949E] tracking-widest uppercase">
                        {NETWORKS.join(' · ')}
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#161B22] transition-colors text-[#8B949E] hover:text-white mt-0.5">
                    <X size={22} />
                </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-8 overflow-y-auto no-scrollbar flex-1 flex flex-col space-y-6">


                <div>
                    <div className="text-xs text-[#8B949E] font-bold uppercase mb-2">{t('withdraw.selectNetwork')}</div>
                    <div className="flex bg-[#1C2333] p-1 rounded-xl overflow-x-auto no-scrollbar">
                        {NETWORKS.map((net) => (
                            <button
                                key={net}
                                onClick={() => {
                                    setActiveNetwork(net);
                                    setError('');
                                    hapticFeedback?.selectionChanged();
                                }}
                                className={`flex-1 min-w-[60px] py-1.5 text-xs font-bold rounded-lg transition-all ${activeNetwork === net
                                    ? 'bg-[#00D26A] text-black shadow-sm'
                                    : 'text-[#8B949E] hover:text-white'
                                    }`}
                            >
                                {net}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-end mb-2">
                        <div className="text-xs text-[#8B949E] font-bold uppercase">{t('withdraw.amountUsd')}</div>
                        <div className="text-[10px] text-[#8B949E]">
                            {t('withdraw.available')} <span className="text-white font-mono">{formatCurrency(balances[activeNetwork])}</span>
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
                            className="w-full bg-[#1C2333] border border-[#30363D] focus:border-[#00D26A] rounded-xl px-4 py-3.5 text-white font-mono text-xl focus:outline-none transition-colors disabled:opacity-50"
                        />
                        <button
                            onClick={handleMax}
                            disabled={loading}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#00D26A] hover:text-white transition-colors bg-[#00D26A]/10 px-2 py-1 rounded"
                        >
                            {t('withdraw.max')}
                        </button>
                    </div>

                    <div className="flex justify-between items-center mt-2 px-1">
                        <div className="text-[10px] text-[#8B949E]">
                            {t('withdraw.minMaxDaily').replace('${min}', withdrawLimits.minAmount.toString()).replace('${max}', withdrawLimits.maxDailyAmount.toString())}
                        </div>
                        <div className="text-[10px] text-[#8B949E]">
                            {t('withdraw.remainingToday')} <span className="text-white font-mono">{formatCurrency(withdrawLimits.remainingToday)}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="text-xs text-[#8B949E] font-bold uppercase mb-2">{t('withdraw.walletAddress')} ({activeNetwork})</div>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => {
                            setAddress(e.target.value);
                            setError('');
                        }}
                        disabled={loading}
                        placeholder={getAddressPlaceholder(activeNetwork)}
                        className="w-full bg-[#1C2333] border border-[#30363D] focus:border-[#00D26A] rounded-xl px-4 py-3.5 text-white font-mono text-sm focus:outline-none transition-colors disabled:opacity-50"
                    />
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-[#FF4444]/10 border border-[#FF4444]/30 text-[#FF4444] text-xs font-semibold text-center animate-in fade-in zoom-in-95 duration-200">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-4">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="py-3.5 rounded-xl border border-[#30363D] text-[#8B949E] font-semibold hover:bg-[#1C2333] transition-colors disabled:opacity-50"
                    >
                        {t('withdraw.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !amount || !address}
                        className="py-3.5 rounded-xl bg-[#00D26A] text-black font-semibold hover:brightness-110 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:active:scale-100"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : t('withdraw.withdrawBtn')}
                    </button>
                </div>

            </div>
        </div>
    );
}
