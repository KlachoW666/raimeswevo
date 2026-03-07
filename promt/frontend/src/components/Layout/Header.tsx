import { useWalletStore } from '../../store/walletStore';
import { useTelegram } from '../../hooks/useTelegram';
import { formatCurrency } from '../../utils/formatters';
import { MoreVertical, X } from 'lucide-react';

export default function Header() {
    const { totalUsd } = useWalletStore();
    const { user } = useTelegram();

    const displayName = user?.username || user?.first_name || 'User';

    return (
        <header
            className="flex w-full justify-between items-center px-4 min-h-[52px] shrink-0 relative z-40 surface-overlay border-b border-white/[0.06]"
            style={{
                paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
                minHeight: 'calc(52px + env(safe-area-inset-top, 0px))',
            }}
        >
            <div className="flex items-center gap-2">
                <span className="font-bold text-[#F1F5F9] text-[17px] tracking-tight">
                    WEVOX <span className="text-[#00E676]">Auto</span>
                </span>
            </div>

            <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#00E676]/12 border border-[#00E676]/20 text-[#00E676] font-semibold text-[12px] font-mono tabular-nums">
                    {formatCurrency(totalUsd)}
                </span>
                <span className="text-[11px] text-[#64748B] hidden sm:inline">@{displayName}</span>
                <div className="flex items-center gap-1 text-[#64748B]">
                    <button type="button" aria-label="Menu" className="p-2 rounded-lg hover:bg-white/5 hover:text-[#94A3B8] transition-colors">
                        <MoreVertical size={18} />
                    </button>
                    <button type="button" aria-label="Close" className="p-2 rounded-lg hover:bg-white/5 hover:text-[#94A3B8] transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
}
