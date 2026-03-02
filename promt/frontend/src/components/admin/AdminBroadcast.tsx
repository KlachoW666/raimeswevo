import { useState } from 'react';
import { useAdminStore } from '../../store/adminStore';
import { useTelegram } from '../../hooks/useTelegram';
import { Send, Users, Star, DollarSign, Clock } from 'lucide-react';

type Audience = 'all' | 'with_balance' | 'vip' | 'custom';

export default function AdminBroadcast() {
    const { users, broadcasts, addBroadcast, addAuditEntry } = useAdminStore();
    const { hapticFeedback, showAlert } = useTelegram();
    const [message, setMessage] = useState('');
    const [audience, setAudience] = useState<Audience>('all');

    const getRecipientCount = () => {
        switch (audience) {
            case 'all': return users.filter(u => !u.isBanned).length;
            case 'with_balance': return users.filter(u => u.balance > 0 && !u.isBanned).length;
            case 'vip': return users.filter(u => u.vipStatus && !u.isBanned).length;
            default: return 0;
        }
    };

    const handleSend = () => {
        if (!message.trim()) return;
        hapticFeedback?.notificationOccurred('success');
        const count = getRecipientCount();
        addBroadcast({ text: message, audience, recipientCount: count });
        addAuditEntry({ adminId: 'admin', action: 'Массовая рассылка', details: `${count} получателей · "${message.slice(0, 50)}..."` });
        if (showAlert) showAlert(`Рассылка отправлена ${count} пользователям`);
        setMessage('');
    };

    const audienceOptions: { key: Audience; label: string; icon: any }[] = [
        { key: 'all', label: 'Все', icon: Users },
        { key: 'with_balance', label: 'С балансом', icon: DollarSign },
        { key: 'vip', label: 'VIP', icon: Star },
    ];

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Compose */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
                <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-3">Новая рассылка</h4>

                {/* Audience Selection */}
                <div className="flex gap-2 mb-4">
                    {audienceOptions.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => { setAudience(key); hapticFeedback?.selectionChanged(); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all ${audience === key ? 'bg-[#00D26A] text-black' : 'bg-[#0D1117] text-[#8B949E] border border-[#30363D]'}`}
                        >
                            <Icon size={12} />
                            {label}
                        </button>
                    ))}
                </div>

                <div className="text-[10px] text-[#8B949E] mb-2">
                    Получатели: <span className="text-white font-bold">{getRecipientCount()}</span> пользователей
                </div>

                {/* Message Input */}
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Введите текст рассылки..."
                    rows={4}
                    className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#00D26A]/50 rounded-xl p-3 text-white text-sm placeholder:text-[#8B949E]/50 outline-none resize-none transition-colors"
                />

                {/* Preview */}
                {message.trim() && (
                    <div className="mt-3 p-3 bg-[#0D1117] rounded-lg border border-[#30363D]/50">
                        <div className="text-[10px] text-[#8B949E] uppercase font-bold mb-1">Предпросмотр</div>
                        <div className="text-sm text-white whitespace-pre-wrap">{message}</div>
                    </div>
                )}

                <button
                    onClick={handleSend}
                    disabled={!message.trim()}
                    className="w-full mt-4 py-3 rounded-xl bg-[#00D26A] text-black font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100"
                >
                    <Send size={16} />
                    Отправить рассылку
                </button>
            </div>

            {/* History */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
                <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-3">
                    <Clock size={12} className="inline mr-1" />
                    История рассылок
                </h4>
                {broadcasts.length === 0 ? (
                    <div className="text-center text-[#8B949E] py-6 text-sm">Нет отправленных рассылок</div>
                ) : (
                    <div className="space-y-2">
                        {broadcasts.map(b => (
                            <div key={b.id} className="bg-[#0D1117] rounded-lg p-3 border border-[#30363D]/30">
                                <div className="flex justify-between items-start mb-1.5">
                                    <span className="text-[10px] text-[#8B949E]">{b.sentAt}</span>
                                    <span className="text-[10px] bg-[#00D26A]/10 text-[#00D26A] px-2 py-0.5 rounded font-bold">
                                        {b.recipientCount} получ.
                                    </span>
                                </div>
                                <div className="text-sm text-white line-clamp-2">{b.text}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
