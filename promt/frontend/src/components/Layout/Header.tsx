import { useWalletStore } from '../../store/walletStore';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from '../../hooks/useTranslation';
import { CONFIG } from '../../config';
import { MessageCircle } from 'lucide-react';

export default function Header() {
    const { totalUsd } = useWalletStore();
    const { t } = useTranslation();

    return (
        <header className="flex w-full justify-between items-center px-5 h-16 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-white/[0.06] shrink-0 relative z-40">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <img
                        src="/logo.svg"
                        alt="Zyphex"
                        className="w-9 h-9 rounded-full relative z-10"
                    />
                    <div className="absolute inset-0 rounded-full bg-[#00E676]/20 blur-md animate-pulse-dot" />
                </div>
                <span className="font-semibold text-[#F8FAFC] text-base tracking-wide">Zyphex Trading</span>
            </div>
            <div className="flex items-center gap-3">
                {CONFIG.SUPPORT_USERNAME && (
                    <a
                        href={`https://t.me/${CONFIG.SUPPORT_USERNAME}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[#8B949E] hover:text-[#F8FAFC] text-xs font-medium transition-colors"
                    >
                        <MessageCircle size={14} />
                        {t('nav.support')}
                    </a>
                )}
                <div className="text-right flex flex-col justify-center h-full">
                <div className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider leading-tight">{t('home.balance')}</div>
                    <div className="flex items-center gap-1.5 justify-end">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse-dot shrink-0" />
                        <div className="text-[#00E676] font-semibold text-sm font-mono tracking-tight text-shadow-green transition-all duration-300">
                            {formatCurrency(totalUsd)}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
