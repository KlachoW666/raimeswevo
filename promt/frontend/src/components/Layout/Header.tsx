import { useWalletStore } from '../../store/walletStore';
import { useUserStore } from '../../store/userStore';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from '../../hooks/useTranslation';
import { CONFIG } from '../../config';
import { MoreVertical, X } from 'lucide-react';

export default function Header() {
    const { totalUsd } = useWalletStore();
    const { userId } = useUserStore();
    const { t } = useTranslation();

    return (
        <header className="flex w-full justify-between items-center px-4 h-[60px] bg-[#162220] border-b border-[#00E676]/10 shrink-0 relative z-40">
            <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg tracking-tight">
                    Alpha<span className="text-[#00E676]">Engine</span>
                </span>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#A1ABB9]">
                        @{userId || 'DevCloude'}
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
