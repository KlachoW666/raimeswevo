import { Grid, Wallet, Users, BarChart3, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useTranslation } from '../../hooks/useTranslation';

export default function BottomNav() {
    const { t } = useTranslation();

    const tabs = [
        { path: '/', label: t('nav.home'), icon: Grid },
        { path: '/wallet', label: t('nav.wallet'), icon: Wallet },
        { path: '/referrals', label: t('nav.referrals'), icon: Users },
        { path: '/stats', label: t('nav.stats'), icon: BarChart3 },
        { path: '/settings', label: t('nav.settings'), icon: Settings }
    ];

    return (
        <nav className="flex justify-around items-center h-16 bg-[#161B22] border-t border-[#30363D] pb-[env(safe-area-inset-bottom)] shrink-0 px-2 relative z-50">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        className={({ isActive }) => clsx(
                            'flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors',
                            isActive ? 'text-[#00D26A]' : 'text-[#8B949E] hover:text-white'
                        )}
                    >
                        <Icon size={24} strokeWidth={1.5} />
                        <span className="text-[10px] uppercase font-semibold tracking-wider">{tab.label}</span>
                    </NavLink>
                );
            })}
        </nav>
    );
}
