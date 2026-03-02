import { useAdminStore } from '../../store/adminStore';
import { Clock, ShieldAlert } from 'lucide-react';

export default function AdminAuditLog() {
    const { auditLog } = useAdminStore();

    const getActionColor = (action: string) => {
        if (action.includes('Бан') || action.includes('Удал') || action.includes('Отклон')) return '#FF6B6B';
        if (action.includes('баланс') || action.includes('Доб') || action.includes('Одоб')) return '#00D26A';
        if (action.includes('Винрейт') || action.includes('настро') || action.includes('режим')) return '#58A6FF';
        if (action.includes('рассылк')) return '#F778BA';
        return '#8B949E';
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#8B949E]" />
                    <span className="text-xs text-[#8B949E]">{auditLog.length} записей</span>
                </div>
            </div>

            {auditLog.length === 0 ? (
                <div className="text-center text-[#8B949E] py-16">
                    <ShieldAlert size={32} className="mx-auto mb-3 opacity-30" />
                    <div className="text-sm">Журнал пуст</div>
                    <div className="text-[11px] opacity-60 mt-1">Здесь появятся записи о действиях</div>
                </div>
            ) : (
                <div className="space-y-1">
                    {auditLog.map(entry => {
                        const color = getActionColor(entry.action);
                        return (
                            <div key={entry.id} className="bg-[#161B22] border border-[#30363D]/50 rounded-xl p-3.5 flex gap-3 group hover:border-[#30363D] transition-colors">
                                <div className="w-2 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: color, minHeight: '100%' }} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[11px] font-bold text-white">{entry.action}</span>
                                        <span className="text-[10px] text-[#8B949E] font-mono shrink-0 ml-2">{entry.timestamp}</span>
                                    </div>
                                    <div className="text-[11px] text-[#8B949E] truncate">{entry.details}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
