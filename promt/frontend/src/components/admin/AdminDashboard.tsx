import { useAdminStore } from '../../store/adminStore';
import { useTradeStore } from '../../store/tradeStore';
import { Users, DollarSign, TrendingUp, ArrowDownLeft, ArrowUpRight, Activity, Star, ShieldAlert } from 'lucide-react';

export default function AdminDashboard() {
    const { users, transactions } = useAdminStore();
    const { metrics, stats } = useTradeStore();

    const totalUsers = users.length;
    const bannedUsers = users.filter(u => u.isBanned).length;
    const activeUsers = users.filter(u => u.balance > 0).length;
    const vipUsers = users.filter(u => u.vipStatus).length;
    const totalBalance = users.reduce((acc, u) => acc + u.balance, 0);
    const totalDeposited = users.reduce((acc, u) => acc + u.totalDeposited, 0);
    const totalWithdrawn = users.reduce((acc, u) => acc + u.totalWithdrawn, 0);
    const pendingWithdrawals = transactions.filter(t => t.type === 'withdraw' && t.status === 'pending');
    const pendingAmount = pendingWithdrawals.reduce((acc, t) => acc + t.amount, 0);

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-3">
                <StatWidget icon={Users} label="Пользователи" value={totalUsers} sub={`${bannedUsers} забанено`} color="#58A6FF" />
                <StatWidget icon={DollarSign} label="Общий баланс" value={`$${totalBalance.toFixed(0)}`} sub={`${activeUsers} активных`} color="#00E676" />
                <StatWidget icon={ArrowDownLeft} label="Всего депозитов" value={`$${totalDeposited.toFixed(0)}`} sub="За всё время" color="#00E676" />
                <StatWidget icon={ArrowUpRight} label="Всего выводов" value={`$${totalWithdrawn.toFixed(0)}`} sub="За всё время" color="#FF6B6B" />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-3 gap-3">
                <MiniStat icon={Activity} label="Сделок" value={metrics.executionsSession.toString()} />
                <MiniStat icon={TrendingUp} label="Винрейт" value={`${stats.winRate.toFixed(1)}%`} />
                <MiniStat icon={Star} label="VIP" value={vipUsers.toString()} />
            </div>

            {/* Pending Withdrawals Alert */}
            {pendingWithdrawals.length > 0 && (
                <div className="bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FF6B6B]/20 flex items-center justify-center text-[#FF6B6B] shrink-0">
                        <ShieldAlert size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white">Ожидают одобрения</div>
                        <div className="text-xs text-[#8B949E]">{pendingWithdrawals.length} заявок на ${pendingAmount.toFixed(2)}</div>
                    </div>
                </div>
            )}

            {/* Recent Transactions */}
            <div className="bento-card rounded-xl p-4">
                <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-3">Последние транзакции</h4>
                <div className="space-y-2">
                    {transactions.slice(0, 5).map(tx => (
                        <div key={tx.id} className="flex items-center justify-between py-2 border-b border-[#30363D]/30 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'deposit' ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-[#FF6B6B]/10 text-[#FF6B6B]'}`}>
                                    {tx.type === 'deposit' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">{tx.userName}</div>
                                    <div className="text-[10px] text-[#8B949E]">{tx.network} · {tx.createdAt}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-sm font-bold ${tx.type === 'deposit' ? 'text-[#00E676]' : 'text-[#FF6B6B]'}`}>
                                    {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                                </div>
                                <div className={`text-[10px] font-bold uppercase ${tx.status === 'pending' ? 'text-yellow-500' : tx.status === 'approved' ? 'text-[#00E676]' : 'text-[#FF4444]'}`}>
                                    {tx.status}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StatWidget({ icon: Icon, label, value, sub, color }: any) {
    return (
        <div className="bento-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                    <Icon size={16} style={{ color }} />
                </div>
            </div>
            <div className="text-xl font-bold text-white font-mono tracking-tight">{value}</div>
            <div className="text-[11px] text-[#8B949E] mt-1">{label}</div>
            <div className="text-[10px] text-[#8B949E] opacity-60">{sub}</div>
        </div>
    );
}

function MiniStat({ icon: Icon, label, value }: any) {
    return (
        <div className="bento-card rounded-xl p-3 text-center">
            <Icon size={14} className="text-[#8B949E] mx-auto mb-1.5" />
            <div className="text-lg font-bold text-white font-mono">{value}</div>
            <div className="text-[10px] text-[#8B949E]">{label}</div>
        </div>
    );
}
