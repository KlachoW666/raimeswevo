import { useWalletStore } from '../../store/walletStore';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from '../../hooks/useTranslation';

export default function Header() {
    const { totalUsd } = useWalletStore();
    const { t } = useTranslation();

    return (
        <header className="flex w-full justify-between items-center px-5 h-16 bg-[#0D1117] border-b border-[#30363D] shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#00D26A] flex items-center justify-center text-black font-bold text-xl leading-none">
                    A
                </div>
                <span className="font-semibold text-white text-base tracking-wide">Zyphex Trading</span>
            </div>
            <div className="text-right flex flex-col justify-center h-full">
                <div className="text-[10px] text-[#8B949E] font-bold uppercase tracking-wider leading-tight">{t('home.balance')}</div>
                <div className="text-[#00D26A] font-semibold text-sm font-mono tracking-tight">
                    {formatCurrency(totalUsd)}
                </div>
            </div>
        </header>
    );
}
