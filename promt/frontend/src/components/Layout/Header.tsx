import { useWalletStore } from '../../store/walletStore';
import { useTelegram } from '../../hooks/useTelegram';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from '../../hooks/useTranslation';
import { MoreVertical, X } from 'lucide-react';

export default function Header() {
    const { totalUsd } = useWalletStore();
    const { user } = useTelegram();
    const { t } = useTranslation();

    const displayName = user?.username || user?.first_name || 'User';

    return (
        <header className="flex w-full justify-between items-center px-4 min-h-[60px] bg-[#162220] border-b border-[#00E676]/10 shrink-0 relative z-40" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)', minHeight: 'calc(60px + env(safe-area-inset-top, 0px))' }}>
            <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg tracking-tight">
                    WEVOX <span className="text-[#00E676]">Auto</span>
                </span>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#A1ABB9]">
                        @{displayName}
                    </span>
                    <span className="text-[11px] text-[#64748B] uppercase tracking-wider">
                        {t('home.balance')}
                    </span>
                    <span className="text-[#00E676] font-bold text-[13px] font-mono">
                        {formatCurrency(totalUsd)}
                    </span>
                </div>

                <div className="flex items-center gap-3 text-[#64748B]">
                    <MoreVertical size={18} className="cursor-pointer hover:text-white transition-colors" />
                    <X size={20} className="cursor-pointer hover:text-white transition-colors" />
                </div>
            </div>
        </header>
    );
}
