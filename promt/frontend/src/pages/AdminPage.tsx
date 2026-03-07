import { ShieldAlert, LayoutDashboard, Users, DollarSign, Bot, Megaphone, Settings, ScrollText, Coins } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useNavigate } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';
import UserManagementModal from '../components/features/UserManagementModal';

const AdminDashboard = lazy(() => import('../components/admin/AdminDashboard').then(m => ({ default: m.default })));
const AdminFinance = lazy(() => import('../components/admin/AdminFinance').then(m => ({ default: m.default })));
const AdminTradeSettings = lazy(() => import('../components/admin/AdminTradeSettings').then(m => ({ default: m.default })));
const AdminBroadcast = lazy(() => import('../components/admin/AdminBroadcast').then(m => ({ default: m.default })));
const AdminSystemSettings = lazy(() => import('../components/admin/AdminSystemSettings').then(m => ({ default: m.default })));
const AdminAuditLog = lazy(() => import('../components/admin/AdminAuditLog').then(m => ({ default: m.default })));
const AdminZyphex = lazy(() => import('../components/admin/AdminZyphex').then(m => ({ default: m.default })));

type AdminTab = 'dashboard' | 'users' | 'finance' | 'trade' | 'broadcast' | 'wevox' | 'settings' | 'audit';

const tabs: { key: AdminTab; label: string; icon: any }[] = [
    { key: 'dashboard', label: '📊', icon: LayoutDashboard },
    { key: 'users', label: '👥', icon: Users },
    { key: 'finance', label: '💸', icon: DollarSign },
    { key: 'trade', label: '🤖', icon: Bot },
    { key: 'broadcast', label: '📢', icon: Megaphone },
    { key: 'wevox', label: '🪙', icon: Coins },
    { key: 'settings', label: '⚙️', icon: Settings },
    { key: 'audit', label: '📋', icon: ScrollText },
];

const tabNames: Record<AdminTab, string> = {
    dashboard: 'Дашборд',
    users: 'Пользователи',
    finance: 'Финансы',
    trade: 'Торговля',
    broadcast: 'Рассылка',
    wevox: 'WEVOX',
    settings: 'Настройки',
    audit: 'Журнал',
};

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const { isAdmin } = useUserStore();
    const navigate = useNavigate();

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-5 text-center h-full">
                <ShieldAlert size={48} className="text-[#FF4444] mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Доступ запрещен</h2>
                <p className="text-[#8B949E] text-sm mb-6">Эта страница доступна только администраторам.</p>
                <button onClick={() => navigate(-1)} className="btn-secondary px-6 py-2.5">
                    Вернуться назад
                </button>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <AdminDashboard />;
            case 'users': return (
                <div className="space-y-3 animate-in fade-in duration-300">
                    <button
                        onClick={() => setIsUserModalOpen(true)}
                        className="w-full bento-card hover:border-[#00E676]/30 rounded-[14px] p-4 flex items-center gap-4 transition-all active:scale-[0.98]"
                    >
                        <div className="w-10 h-10 rounded-[14px] bg-[#00E676]/10 flex items-center justify-center text-[#00E676]">
                            <Users size={20} />
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-bold text-[#F1F5F9]">Управление пользователями</div>
                            <div className="text-[10px] text-[#8B949E]">Поиск, баланс, бан, VIP, заметки</div>
                        </div>
                    </button>
                </div>
            );
            case 'finance': return <AdminFinance />;
            case 'trade': return <AdminTradeSettings />;
            case 'broadcast': return <AdminBroadcast />;
            case 'wevox': return <AdminZyphex />;
            case 'settings': return <AdminSystemSettings />;
            case 'audit': return <AdminAuditLog />;
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3 shrink-0">
                <div className="w-8 h-8 rounded-full bg-[#00E676] text-black flex items-center justify-center">
                    <ShieldAlert size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-[#F1F5F9] tracking-wide leading-tight">{tabNames[activeTab]}</h2>
                    <p className="text-[#8B949E] text-[10px] opacity-80">Панель управления</p>
                </div>
            </div>

            <div className="flex bento-card rounded-[14px] p-1 mb-4 gap-0.5 shrink-0 overflow-x-auto no-scrollbar">
                {tabs.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex-1 min-w-[40px] py-2 rounded-[10px] text-sm transition-all ${activeTab === key ? 'btn-primary scale-105' : 'text-[#94A3B8] hover:bg-white/[0.06] hover:text-[#F1F5F9]'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-4">
                <Suspense fallback={<div className="flex items-center justify-center py-12 text-[#64748B] text-sm">Загрузка…</div>}>
                    {renderContent()}
                </Suspense>
            </div>

            {/* User Modal */}
            <UserManagementModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
            />
        </div>
    );
}
