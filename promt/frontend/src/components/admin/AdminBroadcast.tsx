import { useState, useEffect } from 'react';
import { useAdminStore } from '../../store/adminStore';
import { useUserStore } from '../../store/userStore';
import { useTelegram } from '../../hooks/useTelegram';
import { Send, Users, Star, DollarSign, Clock } from 'lucide-react';
import { fetchBroadcasts, createBroadcast, sendBroadcast, type BroadcastItem } from '../../api/adminApi';

type Audience = 'all' | 'with_balance' | 'vip' | 'custom';

export default function AdminBroadcast() {
    const { addAuditEntry } = useAdminStore();
    const { userId: adminUserId } = useUserStore();
    const { hapticFeedback, showAlert } = useTelegram();
    const [message, setMessage] = useState('');
    const [audience, setAudience] = useState<Audience>('all');
    const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!adminUserId) return;
        fetchBroadcasts(adminUserId).then(setBroadcasts).catch(() => setBroadcasts([]));
    }, [adminUserId]);

    const handleSend = async () => {
        if (!message.trim() || !adminUserId) return;
        setSending(true);
        try {
            const { id, recipientCount } = await createBroadcast(adminUserId, message.trim(), audience);
            addAuditEntry({ adminId: adminUserId, action: 'Массовая рассылка', details: `${recipientCount} получателей · "${message.slice(0, 50)}..."` });
            const result = await sendBroadcast(adminUserId, id);
            hapticFeedback?.notificationOccurred(result.failed === 0 ? 'success' : 'warning');
            if (result.failed === 0) {
                if (showAlert) showAlert(`Отправлено: ${result.sent} из ${recipientCount}`);
            } else {
                const detail = result.errorDetail || 'Не удалось доставить части сообщений.';
                if (showAlert) showAlert(`Доставлено: ${result.sent}, не доставлено: ${result.failed}. ${detail}`);
            }
            setMessage('');
            const list = await fetchBroadcasts(adminUserId);
            setBroadcasts(list);
        } catch (e: unknown) {
            const err = e instanceof Error ? e : null;
            const msg = err?.message || 'Ошибка при отправке рассылки';
            if (showAlert) showAlert(msg.includes('TELEGRAM_BOT_TOKEN') ? 'Добавьте TELEGRAM_BOT_TOKEN в promt/backend/.env и перезапустите backend' : msg);
        } finally {
            setSending(false);
        }
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
                    Получатели: по выбранной аудитории (все / с балансом / VIP) — количество уточняется при отправке
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
                    disabled={!message.trim() || sending}
                    className="w-full mt-4 py-3 rounded-xl bg-[#00D26A] text-black font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100"
                >
                    <Send size={16} />
                    {sending ? 'Отправка...' : 'Отправить рассылку'}
                </button>
            </div>

            {/* History */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
                <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-3">
                    <Clock size={12} className="inline mr-1" />
                    История рассылок
                </h4>
                {broadcasts.length === 0 ? (
                    <div className="text-center text-[#8B949E] py-6 text-sm">Нет рассылок. Заполните TELEGRAM_BOT_TOKEN в .env для отправки в Telegram.</div>
                ) : (
                    <div className="space-y-2">
                        {broadcasts.map(b => (
                            <div key={b.id} className="bg-[#0D1117] rounded-lg p-3 border border-[#30363D]/30">
                                <div className="flex justify-between items-start mb-1.5">
                                    <span className="text-[10px] text-[#8B949E]">{b.sentAt || b.createdAt?.slice(0, 16).replace('T', ' ')}</span>
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
