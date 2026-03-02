import { Calendar, BarChart2, TrendingUp, Percent } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export default function StatsPage() {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div className="text-center pt-2 pb-4">
                <h2 className="text-xl font-semibold mb-1">{t('stats.title')}</h2>
                <p className="text-[#8B949E] text-xs">{t('stats.subtitle')}</p>
            </div>

            <section>
                <h3 className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider mb-3">{t('stats.pnlPeriods')}</h3>

                <div className="space-y-3">
                    <StatCard
                        title={t('stats.pnlToday')}
                        amount={`$0,00`}
                        sub={`0 ${t('stats.tradesToday')}`}
                        icon={Calendar}
                        positive={true}
                    />
                    <StatCard
                        title={t('stats.pnlWeek')}
                        amount={`$0,00`}
                        sub={`${t('stats.for7Days')} 0 ${t('stats.tradesText')}`}
                        icon={BarChart2}
                        positive={true}
                    />
                    <StatCard
                        title={t('stats.pnlMonth')}
                        amount={`$0,00`}
                        sub={`${t('stats.for30Days')} 0 ${t('stats.tradesText')}`}
                        icon={TrendingUp}
                        positive={true}
                    />
                </div>
            </section>

            <section className="pt-4">
                <h3 className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider mb-3">{t('stats.performance')}</h3>

                <div className="bg-[#1C2333]/30 border border-[#30363D]/50 rounded-xl p-5 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#161B22] flex items-center justify-center border border-[#30363D]/50 shrink-0">
                        <Percent size={20} className="text-[#8B949E]" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[13px] font-medium text-[#8B949E]">{t('stats.winrate')}</div>
                            <div className="h-1.5 bg-[#161B22] rounded-full flex-1 ml-4 overflow-hidden border border-[#30363D]/30">
                                <div className="h-full bg-[#00D26A]" style={{ width: `0%` }}></div>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <div className="text-3xl font-mono font-bold text-white transition-all tracking-tight">0.0%</div>
                            <div className="text-[11px] text-[#8B949E] opacity-70">0 {t('stats.profitableOf')} 0 {t('stats.totalFixed')}</div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function StatCard({ title, amount, sub, icon: Icon, positive }: any) {
    return (
        <div className="bg-[#1C2333]/50 border border-[#30363D]/50 rounded-xl p-5 flex items-start justify-between">
            <div className="flex flex-col">
                <div className="text-[13px] font-medium text-[#8B949E] mb-2">{title}</div>
                <div className={`text-2xl font-mono font-bold tracking-tight mb-1.5 transition-all ${positive ? 'text-[#00D26A]' : 'text-[#FF4444]'}`}>{amount}</div>
                <div className="text-[11px] text-[#8B949E] opacity-70">{sub}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#161B22]/80 flex items-center justify-center border border-[#30363D]/50">
                <Icon size={18} className="text-[#8B949E]" />
            </div>
        </div>
    );
}
