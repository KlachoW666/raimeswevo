import { Calendar, BarChart2, TrendingUp, Percent } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useTradeStore } from '../store/tradeStore';
import { formatCurrency } from '../utils/formatters';

const ICON_COLORS = {
    today: { bg: 'bg-[#60A5FA]/10', text: 'text-[#60A5FA]' },
    week: { bg: 'bg-[#A78BFA]/10', text: 'text-[#A78BFA]' },
    month: { bg: 'bg-[#00E676]/10', text: 'text-[#00E676]' },
};

export default function StatsPage() {
    const { t } = useTranslation();
    const { stats } = useTradeStore();

    return (
        <div className="space-y-5 stagger-children">
            <div className="text-center pt-2 pb-4">
                <h2 className="text-xl font-bold mb-1 text-[#F1F5F9]">{t('stats.title')}</h2>
                <p className="text-[#64748B] text-xs">{t('stats.subtitle')}</p>
            </div>

            <section>
                <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3">{t('stats.pnlPeriods')}</h3>

                <div className="space-y-3">
                    <StatCard
                        title={t('stats.pnlToday')}
                        amount={formatCurrency(stats.todayPnl)}
                        sub={`${stats.totalTrades} ${t('stats.tradesToday')}`}
                        icon={Calendar}
                        positive={stats.todayPnl >= 0}
                        colors={ICON_COLORS.today}
                    />
                    <StatCard
                        title={t('stats.pnlWeek')}
                        amount={formatCurrency(stats.weekPnl)}
                        sub={`${t('stats.for7Days')} ${stats.totalTrades} ${t('stats.tradesText')}`}
                        icon={BarChart2}
                        positive={stats.weekPnl >= 0}
                        colors={ICON_COLORS.week}
                    />
                    <StatCard
                        title={t('stats.pnlMonth')}
                        amount={formatCurrency(stats.monthPnl)}
                        sub={`${t('stats.for30Days')} ${stats.totalTrades} ${t('stats.tradesText')}`}
                        icon={TrendingUp}
                        positive={stats.monthPnl >= 0}
                        colors={ICON_COLORS.month}
                    />
                </div>
            </section>

            <section className="pt-4">
                <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3">{t('stats.performance')}</h3>

                <div className="surface-floating p-5 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-[18px] bg-[#00E676]/10 flex items-center justify-center shrink-0">
                        <Percent size={20} className="text-[#00E676]" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[13px] font-medium text-[#94A3B8]">{t('stats.winrate')}</div>
                            <div className="h-2 bg-[#111820] rounded-full flex-1 ml-4 overflow-hidden border border-white/[0.06]">
                                <div
                                    className="h-full bg-gradient-to-r from-[#00E676] to-[#00C853] transition-all duration-700 rounded-full shadow-[0_0_8px_rgba(0,230,118,0.3)]"
                                    style={{ width: `${Math.min(100, stats.winRate)}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <div className="text-4xl font-mono font-bold text-[#F8FAFC] transition-all tracking-tight text-shadow-green">
                                {stats.winRate.toFixed(1)}%
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                                {stats.profitTrades} {t('stats.profitableOf')} {stats.totalTrades} {t('stats.totalFixed')}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function StatCard({ title, amount, sub, icon: Icon, positive, colors }: any) {
    return (
        <div className="stat-card flex items-start justify-between transition-all duration-200 hover:border-white/[0.08]">
            <div className="flex flex-col">
                <div className="text-[13px] font-medium text-[#94A3B8] mb-2">{title}</div>
                <div className={`text-2xl font-mono font-bold tracking-tight mb-1.5 transition-all ${positive ? 'text-[#00E676] text-shadow-green' : 'text-[#FF5252] text-shadow-red'}`}>
                    {amount}
                </div>
                <div className="text-[11px] text-[#64748B]">{sub}</div>
            </div>
            <div className={`w-11 h-11 rounded-[14px] ${colors.bg} flex items-center justify-center`}>
                <Icon size={18} className={colors.text} />
            </div>
        </div>
    );
}
