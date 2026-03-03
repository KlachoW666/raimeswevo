import { useState, useEffect } from 'react';
import { Coins, Save, Download } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { getZyphexRate, setZyphexRate, downloadZyphexExportCsv } from '../../api/adminApi';

export default function AdminZyphex() {
    const { userId: adminUserId } = useUserStore();
    const [rate, setRate] = useState<string>('100');
    const [savedRate, setSavedRate] = useState<number>(100);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!adminUserId) return;
        getZyphexRate(adminUserId).then((r) => {
            setSavedRate(r);
            setRate(String(r));
        }).catch(() => {});
    }, [adminUserId]);

    const handleSaveRate = async () => {
        const num = parseFloat(rate);
        if (!Number.isFinite(num) || num <= 0) {
            setMessage('Введите положительное число');
            return;
        }
        if (!adminUserId) return;
        setLoading(true);
        setMessage('');
        try {
            await setZyphexRate(adminUserId, num);
            setSavedRate(num);
            setMessage('Курс сохранён');
        } catch {
            setMessage('Ошибка сохранения');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!adminUserId) return;
        setExporting(true);
        setMessage('');
        try {
            await downloadZyphexExportCsv(adminUserId);
            setMessage('CSV скачан');
        } catch {
            setMessage('Ошибка экспорта');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
                <div className="flex items-center gap-2 text-[#00E676] font-bold mb-4">
                    <Coins size={20} />
                    Курс ZYPHEX
                </div>
                <p className="text-xs text-[#8B949E] mb-2">Начальный курс (при полном пуле): ZYPHEX за 1 USDT. Фактический курс растёт по мере уменьшения остатка пула.</p>
                <div className="flex gap-2 mb-2">
                    <input
                        type="number"
                        min={0.0001}
                        step={1}
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-xl py-2.5 px-4 text-white text-sm"
                    />
                    <button
                        onClick={handleSaveRate}
                        disabled={loading}
                        className="flex items-center gap-2 bg-[#00D26A] text-black rounded-xl py-2.5 px-4 font-bold text-sm disabled:opacity-50"
                    >
                        <Save size={16} />
                        Сохранить
                    </button>
                </div>
                <p className="text-[10px] text-[#8B949E]">Начальный курс при полном пуле: 1 USDT = <span className="text-[#00E676] font-bold">{savedRate}</span> ZYPHEX</p>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
                <div className="font-bold text-white mb-2">Экспорт для airdrop</div>
                <p className="text-xs text-[#8B949E] mb-3">Скачать CSV со списком пользователей и балансами ZYPHEX (user_id, telegram_id, name, balance_zyphex, total_exchanged_usdt, total_exchanged_zyphex).</p>
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 bg-[#1C2333] hover:bg-[#30363D] border border-[#30363D] text-white rounded-xl py-2.5 px-4 font-semibold text-sm disabled:opacity-50 transition-colors"
                >
                    <Download size={16} />
                    {exporting ? 'Скачивание...' : 'Скачать CSV'}
                </button>
            </div>

            {message && (
                <div className={`text-sm ${message.startsWith('Ошибка') ? 'text-[#FF4444]' : 'text-[#00E676]'}`}>
                    {message}
                </div>
            )}
        </div>
    );
}
