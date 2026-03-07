import { Grid, Wallet, ArrowRightLeft, Users, BarChart3, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useTranslation } from '../../hooks/useTranslation';

export default function BottomNav() {
    const { t } = useTranslation();

    const tabs = [
        { path: '/', label: t('nav.home'), icon: Grid },
        { path: '/wallet', label: t('nav.wallet'), icon: Wallet },
        { path: '/exchange', label: t('nav.exchange'), icon: ArrowRightLeft },
        { path: '/referrals', label: t('nav.referrals'), icon: Users },
        { path: '/stats', label: t('nav.stats'), icon: BarChart3 },
        { path: '/settings', label: t('nav.settings'), icon: Settings },
    ];

    return (
        <nav
            className="flex justify-around items-center mx-3 mb-2 rounded-[20px] h-14 surface-overlay border border-white/[0.06] shrink-0 px-1 relative z-50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)', marginBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        >
            {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        className={({ isActive }) =>
                            clsx(
                                'flex flex-col items-center justify-center flex-1 h-full rounded-xl transition-all duration-200 min-w-0',
                                isActive
                                    ? 'bg-[#00E676]/12 text-[#00E676]'
                                    : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-white/[0.04]'
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon
                                    size={20}
                                    strokeWidth={isActive ? 2.2 : 1.6}
                                    className={clsx('shrink-0 transition-all', isActive && 'drop-shadow-[0_0_8px_rgba(0,230,118,0.4)]')}
                                />
                                <span
                                    className={clsx(
                                        'text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider truncate w-full text-center mt-0.5 transition-colors',
                                        isActive ? 'text-[#00E676]' : 'text-[#64748B]'
                                    )}
                                >
                                    {tab.label}
                                </span>
                            </>
                        )}
                    </NavLink>
                );
            })}
        </nav>
    );
}
