import { useState, useEffect, useRef } from 'react';
import { X, Copy, CheckCircle2, Loader2, Clock } from 'lucide-react';
import QRCode from 'react-qr-code';
import type { Network } from '../../store/walletStore';
import { MockAPI } from '../../api/mockServices';
import { useTelegram } from '../../hooks/useTelegram';
import { useTranslation } from '../../hooks/useTranslation';
import { useUserStore } from '../../store/userStore';

const NETWORKS: Network[] = ['TON', 'BSC', 'BNB', 'TRC', 'SOL', 'BTC', 'ETH'];

export default function DepositModal({ onClose }: { onClose: () => void }) {
    const userId = useUserStore((s) => s.userId);
    const [activeNetwork, setActiveNetwork] = useState<Network>('TON');
    const [address, setAddress] = useState('');
    const [memo, setMemo] = useState('');
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [copiedMemo, setCopiedMemo] = useState(false);
    const [depositStatus, setDepositStatus] = useState<string>('none');
    const [loadError, setLoadError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const { hapticFeedback } = useTelegram();
    const { t } = useTranslation();

    const requestIdRef = useRef(0);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            setLoadError('Сессия не найдена. Закройте и откройте приложение из Telegram снова.');
            return;
        }
        const currentRequestId = ++requestIdRef.current;
        setLoading(true);
        setAddress('');
        setMemo('');
        setDepositStatus('none');
        setCopied(false);
        setCopiedMemo(false);
        setLoadError(null);

        MockAPI.getDepositAddress(activeNetwork).then((data) => {
            if (currentRequestId !== requestIdRef.current) return;
            setAddress(data.address || '');
            setMemo(data.memo || '');
            setLoading(false);
            if (!data.address) setLoadError('Не удалось загрузить адрес. Проверьте интернет и повторите.');
        }).catch((err: unknown) => {
            if (currentRequestId !== requestIdRef.current) return;
            setLoading(false);
            const msg = err instanceof Error ? err.message : '';
            setLoadError(msg ? `Ошибка: ${msg}` : 'Ошибка загрузки. Проверьте интернет и нажмите «Обновить».');
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
    }, [activeNetwork, userId]);

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
        <div
            className="fixed left-0 right-0 top-0 z-50 flex flex-col w-full animate-slide-in-bottom"
            style={{
                background: 'linear-gradient(180deg, #0B0F19 0%, #060A13 100%)',
                height: '100dvh',
                paddingTop: 'env(safe-area-inset-top, 0)',
                paddingBottom: 'env(safe-area-inset-bottom, 0)',
            }}
        >
            <div className="flex justify-between items-start px-4 pt-4 pb-3 shrink-0">
                <div>
                    <h3 className="text-[20px] font-bold text-[#F8FAFC] tracking-wide mb-1">
                        {t('deposit.title')}
                    </h3>
                    <div className="text-[10px] font-semibold text-[#64748B] tracking-widest uppercase">
                        {NETWORKS.join(' · ')}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl glass-card text-[#94A3B8] hover:text-white active:scale-95 touch-manipulation"
                    aria-label="Закрыть"
                >
                    <X size={22} />
                </button>
            </div>

            <div
                className="px-4 pb-6 overflow-y-auto overflow-x-hidden flex-1 min-h-0 flex flex-col no-scrollbar"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >

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
                                className={`min-h-[44px] px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 active:scale-95 touch-manipulation ${activeNetwork === net
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

                        {loadError && (
                            <div className="mb-4 p-4 rounded-xl bg-[#FF5252]/10 border border-[#FF5252]/30 text-[#FF5252] text-sm text-center">
                                {loadError}
                                <button
                                    type="button"
                                    onClick={() => { setLoadError(null); setLoading(true); MockAPI.getDepositAddress(activeNetwork).then((data) => { setAddress(data.address || ''); setMemo(data.memo || ''); setLoading(false); if (!data.address) setLoadError('Не удалось загрузить адрес.'); }).catch((err: unknown) => { setLoading(false); setLoadError(err instanceof Error ? err.message : 'Ошибка загрузки. Повторите.'); }); }}
                                    className="mt-2 block w-full min-h-[44px] py-3 rounded-xl bg-[#FF5252]/20 font-semibold touch-manipulation"
                                >
                                    Обновить
                                </button>
                            </div>
                        )}
                        <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-white mb-8 w-56 h-56 mx-auto relative shadow-[0_8px_30px_rgba(0,0,0,0.3)]" style={{ width: 224, height: 224 }}>
                            {loading || (!address && !loadError) ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white rounded-3xl">
                                    <Loader2 className="animate-spin text-black" size={36} />
                                </div>
                            ) : (
                                <QRCode
                                    value={address}
                                    size={200}
                                    style={{ width: 200, height: 200 }}
                                    aria-label="QR Code"
                                />
                            )}
                        </div>

                        <div className="space-y-4 w-full max-w-sm mx-auto">
                            {/* Deposit Address */}
                            <div className="text-[11px] text-[#64748B] uppercase tracking-wider text-center font-bold">{t('deposit.depositAddress')}</div>

                            <div className="glass-card rounded-2xl p-4 text-left min-h-[72px] flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
                                <div className="flex-1 min-w-0 font-mono text-sm text-[#F8FAFC] break-all leading-relaxed">
                                    {loading ? <div className="w-2/3 h-4 skeleton" /> : address || '—'}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    disabled={loading}
                                    className={`shrink-0 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 active:scale-95 font-bold text-[13px] touch-manipulation ${copied
                                        ? 'glass-card text-[#00E676] border-[#00E676]/40 shadow-[0_0_12px_rgba(0,230,118,0.2)]'
                                        : 'bg-gradient-to-r from-[#00E676] to-[#00C853] text-black shadow-[0_2px_10px_rgba(0,230,118,0.2)]'
                                        }`}
                                >
                                    {copied ? <CheckCircle2 size={16} className="animate-scale-in" /> : <Copy size={16} />}
                                    {t('deposit.copy')}
                                </button>
                            </div>

                            <div className="text-[11px] text-[#FBBF24] uppercase tracking-wider text-center font-bold mt-4">
                                ⚠️ ОБЯЗАТЕЛЬНО УКАЖИТЕ MEMO / КОММЕНТАРИЙ
                            </div>

                            <div className="glass-card rounded-2xl p-4 text-left border-[#FBBF24]/20 min-h-[56px] flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
                                <div className="flex-1 min-w-0 font-mono text-base text-[#FBBF24] font-bold break-all leading-relaxed">
                                    {loading ? <div className="w-1/2 h-4 skeleton" /> : memo || '—'}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyMemo}
                                    disabled={loading}
                                    className={`shrink-0 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 active:scale-95 font-bold text-[13px] touch-manipulation ${copiedMemo
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

                    <div className="text-center text-[12px] text-[#FBBF24]/80 px-2 leading-relaxed pt-6 mt-auto font-medium">
                        Переводите средства ТОЛЬКО в сети {activeNetwork}. Без указания Memo платёж не будет зачислен автоматически.
                    </div>
                </div>
            </div>
        </div>
    );
}
