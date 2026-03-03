import { useState, useEffect, useRef } from 'react';
import { X, Copy, CheckCircle2, Loader2, Clock } from 'lucide-react';
import type { Network } from '../../store/walletStore';
import { MockAPI } from '../../api/mockServices';
import { useTelegram } from '../../hooks/useTelegram';
import { useTranslation } from '../../hooks/useTranslation';

const NETWORKS: Network[] = ['TON', 'BSC', 'BNB', 'TRC', 'SOL', 'BTC', 'ETH'];

export default function DepositModal({ onClose }: { onClose: () => void }) {
    const [activeNetwork, setActiveNetwork] = useState<Network>('TON');
    const [address, setAddress] = useState('');
    const [memo, setMemo] = useState('');
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [copiedMemo, setCopiedMemo] = useState(false);
    const [depositStatus, setDepositStatus] = useState<string>('none');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const { hapticFeedback } = useTelegram();
    const { t } = useTranslation();

    // Request counter to prevent race conditions when switching networks fast
    const requestIdRef = useRef(0);

    useEffect(() => {
        const currentRequestId = ++requestIdRef.current;
        setLoading(true);
        setAddress('');
        setMemo('');
        setDepositStatus('none');
        setCopied(false);
        setCopiedMemo(false);

        MockAPI.getDepositAddress(activeNetwork).then((data) => {
            if (currentRequestId !== requestIdRef.current) return;
            setAddress(data.address);
            setMemo(data.memo);
            setLoading(false);
        });

        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            if (currentRequestId !== requestIdRef.current) return;
            const status = await MockAPI.checkDepositStatus(activeNetwork);
            if (currentRequestId !== requestIdRef.current) return;
            setDepositStatus(status);
            if (status === 'confirmed') {
                hapticFeedback?.notificationOccurred('success');
                MockAPI.fetchBalance();
            }
        }, 10_000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [activeNetwork]);

    const handleCopy = () => {
        navigator.clipboard.writeText(address);
        setCopied(true);
        hapticFeedback?.impactOccurred('light');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyMemo = () => {
        navigator.clipboard.writeText(memo);
        setCopiedMemo(true);
        hapticFeedback?.impactOccurred('light');
        setTimeout(() => setCopiedMemo(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col w-full h-full animate-slide-in-bottom" style={{ background: 'linear-gradient(180deg, #0B0F19 0%, #060A13 100%)' }}>

            {/* Header */}
            <div className="flex justify-between items-start px-5 pt-6 pb-4">
                <div>
                    <h3 className="text-[22px] font-bold text-[#F8FAFC] tracking-wide mb-1.5">
                        {t('deposit.title')}
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
            <div className="px-5 pb-8 overflow-y-auto no-scrollbar flex-1 min-h-0 flex flex-col">

                <div className="mb-6 mt-2">
                    <div className="text-[11px] text-[#64748B] mb-3 font-bold uppercase tracking-wider">{t('deposit.selectNetwork')}</div>
                    <div className="flex flex-wrap gap-2">
                        {NETWORKS.map((net) => (
                            <button
                                key={net}
                                onClick={() => {
                                    setActiveNetwork(net);
                                    hapticFeedback?.selectionChanged();
                                }}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 active:scale-95 ${activeNetwork === net
                                    ? 'bg-gradient-to-r from-[#00E676] to-[#00C853] text-black shadow-[0_2px_10px_rgba(0,230,118,0.2)]'
                                    : 'glass-card text-[#94A3B8] hover:text-white'
                                    }`}
                            >
                                {net}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="glass-card-elevated rounded-3xl p-6 flex-1 flex flex-col">
                    <div className="text-center flex-1 flex flex-col">
                        <div className="text-sm font-bold text-[#F8FAFC] mb-8 uppercase tracking-wider">
                            {activeNetwork} <span className="text-[#64748B]">· {activeNetwork === 'TON' ? 'THE OPEN NETWORK' : 'NETWORK'}</span>
                        </div>

                        {/* Deposit Status Indicator */}
                        {depositStatus === 'confirmed' ? (
                            <div className="flex items-center justify-center gap-2 mb-5 py-3 px-4 rounded-xl glass-card border-[#00E676]/30 glow-green animate-scale-in">
                                <CheckCircle2 size={16} className="text-[#00E676]" />
                                <span className="text-[13px] font-semibold text-[#00E676]">Платёж зачислен!</span>
                            </div>
                        ) : depositStatus === 'pending' ? (
                            <div className="flex items-center justify-center gap-2 mb-5 py-3 px-4 rounded-xl glass-card border-[#FBBF24]/30 animate-pulse">
                                <Clock size={16} className="text-[#FBBF24]" />
                                <span className="text-[13px] font-semibold text-[#FBBF24]">Ожидание платежа...</span>
                            </div>
                        ) : (
                            <div className="text-[13px] text-[#64748B] mb-5">
                                {t('deposit.scanToDeposit')}
                            </div>
                        )}

                        <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-white mb-8 w-56 h-56 mx-auto relative shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                            {loading || !address ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white rounded-3xl">
                                    <Loader2 className="animate-spin text-black" size={36} />
                                </div>
                            ) : (
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}&margin=0`}
                                    alt="QR Code"
                                    className="w-full h-full object-contain rounded-xl"
                                />
                            )}
                        </div>

                        <div className="space-y-4 w-full max-w-sm mx-auto">
                            {/* Deposit Address */}
                            <div className="text-[11px] text-[#64748B] uppercase tracking-wider text-center font-bold">{t('deposit.depositAddress')}</div>

                            <div className="relative glass-card rounded-2xl p-4 text-left min-h-[72px] flex items-center">
                                {loading ? (
                                    <div className="w-2/3 h-4 skeleton" />
                                ) : (
                                    <div className="font-mono text-sm text-[#F8FAFC] pr-28 break-all leading-relaxed">
                                        {address}
                                    </div>
                                )}

                                <button
                                    onClick={handleCopy}
                                    disabled={loading}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl transition-all duration-300 active:scale-90 font-bold text-[13px] ${copied
                                        ? 'glass-card text-[#00E676] border-[#00E676]/40 shadow-[0_0_12px_rgba(0,230,118,0.2)]'
                                        : 'bg-gradient-to-r from-[#00E676] to-[#00C853] text-black shadow-[0_2px_10px_rgba(0,230,118,0.2)]'
                                        }`}
                                >
                                    {copied ? <CheckCircle2 size={16} className="animate-scale-in" /> : <Copy size={16} />}
                                    {t('deposit.copy')}
                                </button>
                            </div>

                            {/* Memo / Comment */}
                            <div className="text-[11px] text-[#FBBF24] uppercase tracking-wider text-center font-bold mt-4">
                                ⚠️ ОБЯЗАТЕЛЬНО УКАЖИТЕ MEMO / КОММЕНТАРИЙ
                            </div>

                            <div className="relative glass-card rounded-2xl p-4 text-left border-[#FBBF24]/20 min-h-[56px] flex items-center">
                                {loading ? (
                                    <div className="w-1/2 h-4 skeleton" />
                                ) : (
                                    <div className="font-mono text-base text-[#FBBF24] font-bold pr-28 break-all leading-relaxed">
                                        {memo}
                                    </div>
                                )}

                                <button
                                    onClick={handleCopyMemo}
                                    disabled={loading}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl transition-all duration-300 active:scale-90 font-bold text-[13px] ${copiedMemo
                                        ? 'glass-card text-[#FBBF24] border-[#FBBF24]/40'
                                        : 'bg-[#FBBF24] text-black shadow-[0_2px_10px_rgba(251,191,36,0.2)]'
                                        }`}
                                >
                                    {copiedMemo ? <CheckCircle2 size={16} className="animate-scale-in" /> : <Copy size={16} />}
                                    {t('deposit.copy')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="text-center text-[12px] text-[#FBBF24]/80 px-4 leading-relaxed pt-8 mt-auto font-medium">
                        Переводите средства ТОЛЬКО в сети {activeNetwork}. Без указания Memo платёж не будет зачислен автоматически.
                    </div>
                </div>
            </div>
        </div>
    );
}
