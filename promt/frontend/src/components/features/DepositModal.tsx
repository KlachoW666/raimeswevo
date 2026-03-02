import { useState, useEffect } from 'react';
import { X, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import type { Network } from '../../store/walletStore';
import { MockAPI } from '../../api/mockServices';
import { useTelegram } from '../../hooks/useTelegram';
import { useTranslation } from '../../hooks/useTranslation';

const NETWORKS: Network[] = ['TON', 'BSC', 'TRC', 'SOL', 'BTC', 'ETH'];

export default function DepositModal({ onClose }: { onClose: () => void }) {
    const [activeNetwork, setActiveNetwork] = useState<Network>('TON');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    const { hapticFeedback } = useTelegram();
    const { t } = useTranslation();

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        MockAPI.getDepositAddress(activeNetwork).then((addr) => {
            if (isMounted) {
                setAddress(addr);
                setLoading(false);
                setCopied(false);
            }
        });

        return () => { isMounted = false; };
    }, [activeNetwork]);

    const handleCopy = () => {
        navigator.clipboard.writeText(address);
        setCopied(true);
        hapticFeedback?.impactOccurred('light');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#1C2333] flex flex-col w-full h-full animate-in slide-in-from-bottom duration-300">

            {/* Header */}
            <div className="flex justify-between items-start px-5 pt-6 pb-4">
                <div>
                    <h3 className="text-[22px] font-bold text-white tracking-wide mb-1.5 shadow-sm">
                        {t('deposit.title')}
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
            <div className="px-5 pb-8 overflow-y-auto no-scrollbar flex-1 flex flex-col">

                <div className="mb-6 mt-2">
                    <div className="text-[11px] text-[#8B949E] mb-3">{t('deposit.selectNetwork')}</div>
                    <div className="flex flex-wrap gap-2">
                        {NETWORKS.map((net) => (
                            <button
                                key={net}
                                onClick={() => {
                                    setActiveNetwork(net);
                                    hapticFeedback?.selectionChanged();
                                }}
                                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${activeNetwork === net
                                    ? 'border border-[#00D26A] text-[#00D26A] bg-transparent'
                                    : 'bg-[#161B22] text-[#8B949E] hover:text-white border border-transparent'
                                    }`}
                            >
                                {net}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-[#161B22]/60 border border-[#30363D]/40 rounded-3xl p-6 flex-1 flex flex-col">
                    <div className="text-center flex-1 flex flex-col">
                        <div className="text-sm font-bold text-white mb-8 uppercase tracking-wider">
                            {activeNetwork} <span className="text-[#8B949E]">· {activeNetwork === 'TON' ? 'THE OPEN NETWORK' : 'NETWORK'}</span>
                        </div>

                        <div className="text-[13px] text-[#8B949E] mb-5">
                            {t('deposit.scanToDeposit')}
                        </div>

                        <div className="inline-flex items-center justify-center p-4 rounded-[2rem] bg-white mb-8 w-56 h-56 mx-auto relative shadow-sm">
                            {loading || !address ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white rounded-[2rem]">
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
                            <div className="text-[11px] text-[#8B949E] uppercase tracking-wider text-center font-bold">{t('deposit.depositAddress')}</div>

                            <div className="relative bg-[#11141A] rounded-2xl p-4 text-left border border-[#30363D]/40 shadow-inner min-h-[72px] flex items-center">
                                {loading ? (
                                    <div className="w-2/3 h-4 bg-[#30363D] animate-pulse rounded"></div>
                                ) : (
                                    <div className="font-mono text-sm text-white pr-32 break-all leading-relaxed">
                                        {address}
                                    </div>
                                )}

                                <button
                                    onClick={handleCopy}
                                    disabled={loading}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl transition-all active:scale-95 font-bold text-[13px] ${copied ? 'bg-[#1C2333] text-[#00D26A] border border-[#00D26A]' : 'bg-[#00D26A] text-black hover:brightness-110 shadow-sm'
                                        }`}
                                >
                                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                    {t('deposit.copy')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="text-center text-[12px] text-[#8B949E] px-4 opacity-60 leading-relaxed pt-8 mt-auto">
                        {t('deposit.warning1')} {activeNetwork} {t('deposit.warning2')}
                    </div>
                </div>
            </div>
        </div>
    );
}
