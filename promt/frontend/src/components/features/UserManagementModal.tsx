import { useState, useEffect } from 'react';
import { X, Search, Ban, DollarSign, UserCheck, ShieldAlert, CheckCircle2, Star, MessageSquare, RotateCcw, Gift } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import type { MockAppUser } from '../../store/adminStore';
import { useUserStore } from '../../store/userStore';
import { useTelegram } from '../../hooks/useTelegram';
import { fetchUsers as fetchUsersApi, updateUser as updateUserApi, addBonus, resetBalance } from '../../api/adminApi';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function UserManagementModal({ isOpen, onClose }: Props) {
    const { users, setUsers, updateUserBalance, toggleBanUser, addBonusToUser, updateUserNotes, toggleVipStatus, resetUserBalance, addAuditEntry } = useAdminStore();
    const { userId: adminUserId } = useUserStore();
    const { hapticFeedback, showAlert } = useTelegram();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<MockAppUser | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && adminUserId) {
            setLoading(true);
            fetchUsersApi(adminUserId)
                .then(setUsers)
                .catch(() => setUsers([]))
                .finally(() => setLoading(false));
        }
    }, [isOpen, adminUserId, setUsers]);

    if (!isOpen) return null;

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.includes(searchTerm)
    );

    const refreshSelectedUser = (id: string) => {
        const updated = useAdminStore.getState().users.find(u => u.id === id);
        if (updated) setSelectedUser(updated);
    };

    const refetchAndRefresh = async (id: string) => {
        if (!adminUserId) return;
        const list = await fetchUsersApi(adminUserId);
        setUsers(list);
        const u = list.find(x => x.id === id);
        if (u) setSelectedUser(u);
    };

    const handleUpdateBalance = async () => {
        if (!selectedUser || !adminUserId) return;
        hapticFeedback?.impactOccurred('medium');
        const input = window.prompt(`Новый баланс для ${selectedUser.name}:`, selectedUser.balance.toString());
        if (input !== null) {
            const val = parseFloat(input);
            if (!isNaN(val) && val >= 0) {
                try {
                    await updateUserApi(selectedUser.id, adminUserId, { balance: val });
                    addAuditEntry({ adminId: adminUserId, action: 'Изменение баланса', details: `${selectedUser.name}: $${selectedUser.balance} → $${val}` });
                    await refetchAndRefresh(selectedUser.id);
                    if (showAlert) showAlert(`Баланс обновлен до $${val.toFixed(2)}`);
                } catch {
                    if (showAlert) showAlert('Ошибка сети');
                }
            }
        }
    };

    const handleAddBonus = async () => {
        if (!selectedUser || !adminUserId) return;
        hapticFeedback?.impactOccurred('medium');
        const input = window.prompt(`Бонус для ${selectedUser.name}:`, '100');
        if (input !== null) {
            const val = parseFloat(input);
            if (!isNaN(val) && val > 0) {
                try {
                    await addBonus(selectedUser.id, adminUserId, val);
                    addAuditEntry({ adminId: adminUserId, action: 'Бонус', details: `${selectedUser.name}: +$${val}` });
                    await refetchAndRefresh(selectedUser.id);
                    if (showAlert) showAlert(`Бонус +$${val.toFixed(2)} начислен`);
                } catch {
                    if (showAlert) showAlert('Ошибка сети');
                }
            }
        }
    };

    const handleToggleBan = async () => {
        if (!selectedUser || !adminUserId) return;
        hapticFeedback?.impactOccurred('heavy');
        try {
            await updateUserApi(selectedUser.id, adminUserId, { isBanned: !selectedUser.isBanned });
            const action = selectedUser.isBanned ? 'Разбан' : 'Бан';
            addAuditEntry({ adminId: adminUserId, action: `${action} пользователя`, details: `${selectedUser.name} (${selectedUser.id})` });
            await refetchAndRefresh(selectedUser.id);
            if (showAlert) showAlert(`${selectedUser.name} ${selectedUser.isBanned ? 'разбанен' : 'забанен'}`);
        } catch {
            if (showAlert) showAlert('Ошибка сети');
        }
    };

    const handleToggleVip = async () => {
        if (!selectedUser || !adminUserId) return;
        hapticFeedback?.impactOccurred('medium');
        try {
            await updateUserApi(selectedUser.id, adminUserId, { vipStatus: !selectedUser.vipStatus });
            addAuditEntry({ adminId: adminUserId, action: 'VIP статус', details: `${selectedUser.name}: ${selectedUser.vipStatus ? 'снят' : 'установлен'}` });
            await refetchAndRefresh(selectedUser.id);
        } catch {
            if (showAlert) showAlert('Ошибка сети');
        }
    };

    const handleUpdateNotes = async () => {
        if (!selectedUser || !adminUserId) return;
        const input = window.prompt('Заметка:', selectedUser.notes);
        if (input !== null) {
            try {
                await updateUserApi(selectedUser.id, adminUserId, { notes: input });
                addAuditEntry({ adminId: adminUserId, action: 'Заметка', details: `${selectedUser.name}: "${input.slice(0, 50)}"` });
                await refetchAndRefresh(selectedUser.id);
            } catch {
                if (showAlert) showAlert('Ошибка сети');
            }
        }
    };

    const handleResetBalance = async () => {
        if (!selectedUser || !adminUserId) return;
        if (window.confirm(`Сбросить баланс ${selectedUser.name} до $0?`)) {
            hapticFeedback?.notificationOccurred('warning');
            try {
                await resetBalance(selectedUser.id, adminUserId);
                addAuditEntry({ adminId: adminUserId, action: 'Сброс баланса', details: `${selectedUser.name}: $${selectedUser.balance} → $0` });
                await refetchAndRefresh(selectedUser.id);
                if (showAlert) showAlert('Баланс обнулен');
            } catch {
                if (showAlert) showAlert('Ошибка сети');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0D1117] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#30363D]/50 bg-[#161B22]/80 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={selectedUser ? () => setSelectedUser(null) : onClose}
                        className="w-10 h-10 rounded-full bg-[#1C2333] flex items-center justify-center text-white active:scale-95 transition-transform"
                    >
                        <X size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-white tracking-wide">
                        {selectedUser ? selectedUser.name : 'Пользователи'}
                    </h2>
                </div>
                {selectedUser && (
                    <div className="flex items-center gap-1.5">
                        {selectedUser.vipStatus && <span className="text-[10px] bg-[#F0883E]/20 text-[#F0883E] px-2 py-0.5 rounded-md font-bold">VIP</span>}
                        {selectedUser.isBanned && <span className="text-[10px] bg-[#FF4444]/20 text-[#FF4444] px-2 py-0.5 rounded-md font-bold">BAN</span>}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!selectedUser ? (
                    <>
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B949E]" size={18} />
                            <input
                                type="text"
                                placeholder="Поиск по имени или ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#161B22] border border-[#30363D] focus:border-[#00D26A]/50 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-[#8B949E] outline-none transition-colors"
                            />
                        </div>

                        {/* User List */}
                        <div className="space-y-2">
                            {loading ? (
                                <div className="text-center text-[#8B949E] py-10 text-sm">Загрузка...</div>
                            ) : (
                            filteredUsers.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className="bg-[#161B22] border border-[#30363D] hover:border-[#00D26A]/50 rounded-xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white truncate">{user.name}</span>
                                            {user.vipStatus && <Star size={12} className="text-[#F0883E] shrink-0" />}
                                            {user.isBanned && <span className="text-[10px] bg-[#FF4444]/20 text-[#FF4444] px-2 py-0.5 rounded-md font-bold uppercase shrink-0">Ban</span>}
                                        </div>
                                        <span className="text-xs text-[#8B949E] font-mono">{user.id}</span>
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                        <div className="text-sm font-bold text-[#00D26A]">${user.balance.toFixed(2)}</div>
                                        <div className="text-[10px] text-[#8B949E]">{user.lastActive}</div>
                                    </div>
                                </div>
                            ))
                            )}
                            ))}
                            {!loading && filteredUsers.length === 0 && (
                                <div className="text-center text-[#8B949E] py-10 text-sm">Пользователи не найдены</div>
                            )}
                        </div>
                    </>
                ) : (
                    /* User Details */
                    <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                        {/* Profile Card */}
                        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 text-center">
                            <div className="w-16 h-16 bg-[#1C2333] rounded-full mx-auto mb-3 flex items-center justify-center border-2 border-[#30363D]">
                                {selectedUser.isBanned ? <Ban className="text-[#FF4444]" size={28} /> : <UserCheck className="text-[#00D26A]" size={28} />}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-0.5">{selectedUser.name}</h3>
                            <p className="text-xs text-[#8B949E] font-mono mb-3">{selectedUser.id}</p>

                            <div className="inline-flex flex-col items-center bg-[#0D1117] rounded-xl py-2.5 px-6 border border-[#30363D]">
                                <span className="text-[10px] font-bold text-[#8B949E] uppercase">Баланс</span>
                                <span className="text-2xl font-bold text-[#00D26A]">${selectedUser.balance.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3 text-center">
                                <div className="text-xs font-bold text-[#00D26A] font-mono">${selectedUser.totalDeposited}</div>
                                <div className="text-[9px] text-[#8B949E] uppercase mt-0.5">Депозиты</div>
                            </div>
                            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3 text-center">
                                <div className="text-xs font-bold text-[#FF6B6B] font-mono">${selectedUser.totalWithdrawn}</div>
                                <div className="text-[9px] text-[#8B949E] uppercase mt-0.5">Выводы</div>
                            </div>
                            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3 text-center">
                                <div className="text-xs font-bold text-white font-mono">{selectedUser.referralCount}</div>
                                <div className="text-[9px] text-[#8B949E] uppercase mt-0.5">Рефералы</div>
                            </div>
                        </div>

                        {/* Info Row */}
                        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3">
                            <div className="grid grid-cols-3 text-center divide-x divide-[#30363D]">
                                <div>
                                    <div className="text-[10px] text-[#8B949E]">Режим</div>
                                    <div className="text-xs font-bold text-white capitalize">{selectedUser.botMode}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-[#8B949E]">Рег.</div>
                                    <div className="text-xs font-bold text-white">{selectedUser.registeredAt}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-[#8B949E]">$ от рефов</div>
                                    <div className="text-xs font-bold text-[#00D26A]">${selectedUser.referralEarnings}</div>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {selectedUser.notes && (
                            <div className="bg-[#161B22] border border-[#30363D]/50 rounded-xl p-3">
                                <div className="text-[10px] text-[#8B949E] uppercase font-bold mb-1">Заметка</div>
                                <div className="text-xs text-white">{selectedUser.notes}</div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-2">
                            <h4 className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider">Действия</h4>

                            <ActionButton icon={DollarSign} label="Изменить баланс" onClick={handleUpdateBalance} color="#00D26A" />
                            <ActionButton icon={Gift} label="Начислить бонус" onClick={handleAddBonus} color="#58A6FF" />
                            <ActionButton icon={Star} label={selectedUser.vipStatus ? 'Снять VIP' : 'Дать VIP'} onClick={handleToggleVip} color="#F0883E" />
                            <ActionButton icon={MessageSquare} label="Заметка" onClick={handleUpdateNotes} color="#8B949E" />
                            <ActionButton
                                icon={selectedUser.isBanned ? CheckCircle2 : ShieldAlert}
                                label={selectedUser.isBanned ? 'Разбанить' : 'Забанить'}
                                onClick={handleToggleBan}
                                color={selectedUser.isBanned ? '#00D26A' : '#FF4444'}
                            />
                            <ActionButton icon={RotateCcw} label="Сбросить баланс" onClick={handleResetBalance} color="#FF6B6B" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ActionButton({ icon: Icon, label, onClick, color }: { icon: any; label: string; onClick: () => void; color: string }) {
    return (
        <button
            onClick={onClick}
            className="w-full bg-[#161B22] border border-[#30363D] hover:border-opacity-80 rounded-xl p-3.5 flex items-center gap-3 transition-all active:scale-[0.98]"
            style={{ borderColor: `${color}30` }}
        >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                <Icon size={18} style={{ color }} />
            </div>
            <span className="text-[14px] font-bold text-white">{label}</span>
        </button>
    );
}
