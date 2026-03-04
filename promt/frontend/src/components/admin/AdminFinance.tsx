import { useAdminStore } from '../../store/adminStore';
import { useUserStore } from '../../store/userStore';
import { useTelegram } from '../../hooks/useTelegram';
import { ArrowUpRight, Check, X, Sliders } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchWithdrawalRequests, setWithdrawalRequestStatus, type WithdrawalRequest } from '../../api/adminApi';

type TabType = 'transactions' | 'limits';

export default function AdminFinance() {
    const { settings, updateSettings, addAuditEntry } = useAdminStore();
    const { userId: adminUserId } = useUserStore();
    const { hapticFeedback, showAlert } = useTelegram();
    const [tab, setTab] = useState<TabType>('transactions');
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (tab !== 'transactions' || !adminUserId) return;
        setLoading(true);
        const statusParam = filter === 'all' ? undefined : filter;
        fetchWithdrawalRequests(adminUserId, statusParam)
            .then(setWithdrawalRequests)
            .catch(() => setWithdrawalRequests([]))
            .finally(() => setLoading(false));
    }, [tab, adminUserId, filter]);

    const handleApprove = async (id: string) => {
        if (!adminUserId) return;
        try {
            await setWithdrawalRequestStatus(id, adminUserId, 'approved');
            hapticFeedback?.notificationOccurred('success');
            addAuditEntry({ adminId: adminUserId, action: 'Одобрение вывода', details: `Заявка ${id}` });
            if (showAlert) showAlert('Заявка одобрена');
            const list = await fetchWithdrawalRequests(adminUserId, filter === 'all' ? undefined : filter);
            setWithdrawalRequests(list);
        } catch {
            if (showAlert) showAlert('Ошибка при одобрении');
        }
    };

    const handleReject = async (id: string) => {
        if (!adminUserId) return;
        try {
            await setWithdrawalRequestStatus(id, adminUserId, 'rejected');
            hapticFeedback?.notificationOccurred('warning');
            addAuditEntry({ adminId: adminUserId, action: 'Отклонение вывода', details: `Заявка ${id}` });
            if (showAlert) showAlert('Заявка отклонена (средства возвращены)');
            const list = await fetchWithdrawalRequests(adminUserId, filter === 'all' ? undefined : filter);
            setWithdrawalRequests(list);
        } catch {
            if (showAlert) showAlert('Ошибка при отклонении');
        }
    };

    const handleSettingChange = (key: string, value: number) => {
        updateSettings({ [key]: value });
        addAuditEntry({ adminId: 'admin', action: 'Изменение настроек', details: `${key}: ${value}` });
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Tab Switcher */}
            <div className="flex bg-[#161B22] rounded-xl p-1 gap-1">
                <button
                    onClick={() => setTab('transactions')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'transactions' ? 'bg-[#00D26A] text-black' : 'text-[#8B949E]'}`}
                >
                    Транзакции
                </button>
                <button
                    onClick={() => setTab('limits')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'limits' ? 'bg-[#00D26A] text-black' : 'text-[#8B949E]'}`}
                >
                    <Sliders size={12} className="inline mr-1" />Лимиты
                </button>
            </div>

            {tab === 'transactions' ? (
                <>
                    {/* Filters */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {(['pending', 'all', 'approved', 'rejected'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${filter === f ? 'bg-[#00D26A] text-black' : 'bg-[#161B22] text-[#8B949E] border border-[#30363D]'}`}
                            >
                                {f === 'all' ? 'Все' : f === 'pending' ? '⏳ Ожидание' : f === 'approved' ? 'Одобрены' : 'Отклонены'}
                            </button>
                        ))}
                    </div>

                    {/* Withdrawal requests from API */}
                    <div className="space-y-2">
                        {loading ? (
                            <div className="text-center text-[#8B949E] py-10 text-sm">Загрузка...</div>
                        ) : withdrawalRequests.map(req => (
                            <div key={req.id} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#FF6B6B]/10 text-[#FF6B6B]">
                                            <ArrowUpRight size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{req.userName}</div>
                                            <div className="text-[10px] text-[#8B949E] font-mono">{req.userId}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-base font-bold font-mono text-[#FF6B6B]">-${req.amount.toFixed(2)}</div>
                                        <div className={`text-[10px] font-bold uppercase ${req.status === 'pending' ? 'text-yellow-500' : req.status === 'approved' ? 'text-[#00D26A]' : 'text-[#FF4444]'}`}>
                                            {req.status === 'pending' ? 'ожидание' : req.status === 'approved' ? 'одобрено' : 'отклонено'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] text-[#8B949E]">{req.network} · {req.address.slice(0, 12)}… · {req.createdAt?.slice(0, 16).replace('T', ' ') || req.createdAt}</div>
                                    {req.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApprove(req.id)} className="w-8 h-8 rounded-lg bg-[#00D26A]/10 flex items-center justify-center text-[#00D26A] active:scale-90 transition-transform">
                                                <Check size={16} />
                                            </button>
                                            <button onClick={() => handleReject(req.id)} className="w-8 h-8 rounded-lg bg-[#FF4444]/10 flex items-center justify-center text-[#FF4444] active:scale-90 transition-transform">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {!loading && withdrawalRequests.length === 0 && (
                            <div className="text-center text-[#8B949E] py-10 text-sm">Нет заявок на вывод</div>
                        )}
                    </div>
                </>
            ) : (
                /* Limits Settings */
                <div className="space-y-4">
                    <SettingSlider label="Мин. вывод ($)" value={settings.minWithdraw} min={1} max={500} onChange={v => handleSettingChange('minWithdraw', v)} />
                    <SettingSlider label="Макс. дневной вывод ($)" value={settings.maxDailyWithdraw} min={100} max={50000} step={100} onChange={v => handleSettingChange('maxDailyWithdraw', v)} />
                    <SettingSlider label="Реферальный % " value={settings.referralPercent} min={1} max={20} onChange={v => handleSettingChange('referralPercent', v)} />
                    <SettingSlider label="Дневная прибыль (%)" value={settings.dailyProfitPercent} min={1} max={15} onChange={v => handleSettingChange('dailyProfitPercent', v)} />

                    {/* Networks Toggle */}
                    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
                        <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-3">Активные сети</h4>
                        <div className="flex flex-wrap gap-2">
                            {['TON', 'BSC', 'BNB', 'TRC', 'SOL', 'BTC', 'ETH'].map(net => {
                                const enabled = settings.enabledNetworks.includes(net);
                                return (
                                    <button
                                        key={net}
                                        onClick={() => {
                                            useAdminStore.getState().toggleNetwork(net);
                                            hapticFeedback?.selectionChanged();
                                        }}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${enabled ? 'bg-[#00D26A] text-black' : 'bg-[#1C2333] text-[#8B949E] border border-[#30363D]'}`}
                                    >
                                        {net}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SettingSlider({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
    return (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-[#8B949E] font-bold">{label}</span>
                <span className="text-sm font-bold text-[#00D26A] font-mono">{value}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-1.5 bg-[#30363D] rounded-full appearance-none cursor-pointer accent-[#00D26A]"
            />
            <div className="flex justify-between mt-1">
                <span className="text-[10px] text-[#8B949E]">{min}</span>
                <span className="text-[10px] text-[#8B949E]">{max}</span>
            </div>
        </div>
    );
}
