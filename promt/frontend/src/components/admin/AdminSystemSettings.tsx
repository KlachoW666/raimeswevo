import { useAdminStore } from '../../store/adminStore';
import { useTelegram } from '../../hooks/useTelegram';
import { CONFIG } from '../../config';
import { ShieldAlert, Globe, Wrench, Download, UserPlus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function AdminSystemSettings() {
    const { settings, updateSettings, addAuditEntry } = useAdminStore();
    const { hapticFeedback, showAlert } = useTelegram();
    const [newAdminId, setNewAdminId] = useState('');

    const handleToggleMaintenance = () => {
        updateSettings({ maintenanceMode: !settings.maintenanceMode });
        hapticFeedback?.notificationOccurred(settings.maintenanceMode ? 'success' : 'warning');
        addAuditEntry({ adminId: 'admin', action: 'Режим обслуживания', details: settings.maintenanceMode ? 'Выключен' : 'Включен' });
    };

    const handleToggleLanguage = () => {
        const newLang = settings.defaultLanguage === 'ru' ? 'en' : 'ru';
        updateSettings({ defaultLanguage: newLang });
        hapticFeedback?.selectionChanged();
        addAuditEntry({ adminId: 'admin', action: 'Язык по умолчанию', details: newLang.toUpperCase() });
    };

    const handleAddAdmin = () => {
        if (!newAdminId.trim()) return;
        if (!CONFIG.ADMIN_IDS.includes(newAdminId.trim())) {
            CONFIG.ADMIN_IDS.push(newAdminId.trim());
            addAuditEntry({ adminId: 'admin', action: 'Добавлен админ', details: newAdminId.trim() });
            hapticFeedback?.notificationOccurred('success');
            if (showAlert) showAlert(`Админ ${newAdminId.trim()} добавлен`);
            setNewAdminId('');
        } else {
            if (showAlert) showAlert('Этот ID уже является администратором');
        }
    };

    const handleRemoveAdmin = (id: string) => {
        const idx = CONFIG.ADMIN_IDS.indexOf(id);
        if (idx > -1) {
            CONFIG.ADMIN_IDS.splice(idx, 1);
            addAuditEntry({ adminId: 'admin', action: 'Удалён админ', details: id });
            hapticFeedback?.notificationOccurred('warning');
            if (showAlert) showAlert(`Админ ${id} удалён`);
        }
    };

    const handleExportCSV = () => {
        hapticFeedback?.impactOccurred('light');
        const { users } = useAdminStore.getState();
        const headers = 'ID,Name,Balance,Banned,VIP,Deposited,Withdrawn,Referrals,Registered\n';
        const rows = users.map(u =>
            `${u.id},${u.name},${u.balance},${u.isBanned},${u.vipStatus},${u.totalDeposited},${u.totalWithdrawn},${u.referralCount},${u.registeredAt}`
        ).join('\n');
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users_export.csv';
        a.click();
        URL.revokeObjectURL(url);
        addAuditEntry({ adminId: 'admin', action: 'Экспорт данных', details: `${users.length} пользователей` });
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Maintenance Mode */}
            <div className={`bg-[#161B22] border rounded-xl p-4 transition-colors ${settings.maintenanceMode ? 'border-[#FF6B6B]/50' : 'border-white/[0.08]'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.maintenanceMode ? 'bg-[#FF6B6B]/10 text-[#FF6B6B]' : 'bg-[#00D26A]/10 text-[#00D26A]'}`}>
                            <Wrench size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">Режим обслуживания</div>
                            <div className="text-[10px] text-[#8B949E]">Временно закрыть доступ для пользователей</div>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleMaintenance}
                        className={`w-12 h-7 rounded-full transition-all relative ${settings.maintenanceMode ? 'bg-[#FF6B6B]' : 'bg-white/[0.08]'}`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${settings.maintenanceMode ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            {/* Default Language */}
            <div className="bento-card rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#58A6FF]/10 flex items-center justify-center text-[#58A6FF]">
                            <Globe size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">Язык по умолчанию</div>
                            <div className="text-[10px] text-[#8B949E]">Для новых пользователей</div>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleLanguage}
                        className="px-4 py-2 rounded-xl bg-[#0D1117] border border-white/[0.08] text-sm font-bold text-white active:scale-95 transition-transform"
                    >
                        {settings.defaultLanguage === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN'}
                    </button>
                </div>
            </div>

            {/* Admin Management */}
            <div className="bento-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <ShieldAlert size={16} className="text-[#F0883E]" />
                    <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">Управление админами</h4>
                </div>

                <div className="space-y-2 mb-3">
                    {CONFIG.ADMIN_IDS.map(id => (
                        <div key={id} className="flex items-center justify-between bg-[#0D1117] rounded-lg px-3 py-2.5 border border-white/[0.08]/30">
                            <span className="text-sm text-white font-mono">{id}</span>
                            <button
                                onClick={() => handleRemoveAdmin(id)}
                                className="w-7 h-7 rounded-lg bg-[#FF4444]/10 flex items-center justify-center text-[#FF4444] active:scale-90 transition-transform"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newAdminId}
                        onChange={e => setNewAdminId(e.target.value)}
                        placeholder="Telegram ID..."
                        className="flex-1 bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm font-mono placeholder:text-[#8B949E]/50 outline-none focus:border-[#00D26A]/50 transition-colors"
                    />
                    <button
                        onClick={handleAddAdmin}
                        disabled={!newAdminId.trim()}
                        className="px-3 py-2 rounded-lg bg-[#00D26A] text-black active:scale-95 transition-transform disabled:opacity-40"
                    >
                        <UserPlus size={16} />
                    </button>
                </div>
            </div>

            {/* Export Data */}
            <button
                onClick={handleExportCSV}
                className="w-full bento-card hover:border-[#00D26A]/50 rounded-xl p-4 flex items-center gap-4 transition-all active:scale-[0.98]"
            >
                <div className="w-10 h-10 rounded-xl bg-[#00D26A]/10 flex items-center justify-center text-[#00D26A]">
                    <Download size={20} />
                </div>
                <div className="text-left">
                    <div className="text-sm font-bold text-white">Экспорт данных</div>
                    <div className="text-[10px] text-[#8B949E]">Скачать CSV с пользователями</div>
                </div>
            </button>
        </div>
    );
}
