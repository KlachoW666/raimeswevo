import { useState, useEffect } from 'react';
import { Coins, Save, Download, Database, Ticket, Calendar } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { getZyphexRate, setZyphexRate, getZyphexSupply, setZyphexSupply, getListingDate, setListingDate, downloadZyphexExportCsv, listPromoCodes, createPromoCode, type PromoCodeItem } from '../../api/adminApi';

function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
}

function fromDatetimeLocal(local: string): string {
    if (!local) return '';
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export default function AdminZyphex() {
    const { userId: adminUserId } = useUserStore();
    const [rate, setRate] = useState<string>('100');
    const [savedRate, setSavedRate] = useState<number>(100);
    const [supply, setSupply] = useState<string>('1000000');
    const [savedSupply, setSavedSupply] = useState<number>(1000000);
    const [sold, setSold] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [loadingSupply, setLoadingSupply] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [message, setMessage] = useState('');
    const [promos, setPromos] = useState<PromoCodeItem[]>([]);
    const [promoCode, setPromoCode] = useState('');
    const [promoAmount, setPromoAmount] = useState('');
    const [promoMaxUses, setPromoMaxUses] = useState('');
    const [promoCreating, setPromoCreating] = useState(false);
    const [listingDateLocal, setListingDateLocal] = useState('');
    const [savedListingDate, setSavedListingDate] = useState('');
    const [loadingListing, setLoadingListing] = useState(false);

    useEffect(() => {
        if (!adminUserId) return;
        getListingDate(adminUserId).then((date) => {
            setSavedListingDate(date);
            setListingDateLocal(toDatetimeLocal(date));
        }).catch(() => {});
    }, [adminUserId]);

    useEffect(() => {
        if (!adminUserId) return;
        getZyphexRate(adminUserId).then((r) => {
            setSavedRate(r);
            setRate(String(r));
        }).catch(() => {});
    }, [adminUserId]);

    useEffect(() => {
        if (!adminUserId) return;
        getZyphexSupply(adminUserId).then((data) => {
            setSavedSupply(data.supply);
            setSupply(String(data.supply));
            setSold(data.sold);
        }).catch(() => {});
    }, [adminUserId]);

    useEffect(() => {
        if (!adminUserId) return;
        listPromoCodes(adminUserId).then(setPromos).catch(() => setPromos([]));
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

    const handleSaveSupply = async () => {
        const num = parseInt(supply, 10);
        if (!Number.isFinite(num) || num < 0) {
            setMessage('Введите неотрицательное целое число');
            return;
        }
        if (num < sold) {
            setMessage(`Объём пула не может быть меньше уже выданного (${sold.toLocaleString()} WEVOX)`);
            return;
        }
        if (!adminUserId) return;
        setLoadingSupply(true);
        setMessage('');
        try {
            await setZyphexSupply(adminUserId, num);
            setSavedSupply(num);
            setMessage('Объём пула сохранён');
        } catch {
            setMessage('Ошибка сохранения');
        } finally {
            setLoadingSupply(false);
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

    const handleCreatePromo = async () => {
        const code = promoCode.trim().toUpperCase();
        const amount = parseFloat(promoAmount);
        const maxUses = parseInt(promoMaxUses, 10);
        if (!code || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(maxUses) || maxUses < 1) {
            setMessage('Заполните код, количество WEVOX (положительное) и макс. использований (≥ 1)');
            return;
        }
        if (!adminUserId) return;
        setPromoCreating(true);
        setMessage('');
        try {
            await createPromoCode(adminUserId, code, amount, maxUses);
            setPromoCode('');
            setPromoAmount('');
            setPromoMaxUses('');
            setMessage('Промокод создан');
            const list = await listPromoCodes(adminUserId);
            setPromos(list);
        } catch (e: unknown) {
            const err = e instanceof Error ? e : null;
            const msg = err?.message ?? '';
            setMessage(msg === 'code_exists' || (err as { error?: string })?.error === 'code_exists' ? 'Промокод с таким кодом уже есть' : 'Ошибка создания промокода');
        } finally {
            setPromoCreating(false);
        }
    };

    const handleSaveListingDate = async () => {
        const iso = fromDatetimeLocal(listingDateLocal);
        if (!iso) {
            setMessage('Укажите дату и время');
            return;
        }
        if (!adminUserId) return;
        setLoadingListing(true);
        setMessage('');
        try {
            const updated = await setListingDate(adminUserId, iso);
            setSavedListingDate(updated);
            setListingDateLocal(toDatetimeLocal(updated));
            setMessage('Дата листинга сохранена');
        } catch {
            setMessage('Ошибка сохранения даты');
        } finally {
            setLoadingListing(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bento-card rounded-xl p-5">
                <div className="flex items-center gap-2 text-[#00E676] font-bold mb-4">
                    <Calendar size={20} />
                    Дата листинга WEVOX
                </div>
                <p className="text-xs text-[#8B949E] mb-2">Время до листинга отображается на главной и на лендинге. Формат: дата и время (ваша локальная зона).</p>
                <div className="flex flex-wrap gap-2 mb-2">
                    <input
                        type="datetime-local"
                        value={listingDateLocal}
                        onChange={(e) => setListingDateLocal(e.target.value)}
                        className="flex-1 min-w-[200px] bg-[#111820] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white text-sm"
                    />
                    <button
                        type="button"
                        onClick={handleSaveListingDate}
                        disabled={loadingListing}
                        className="flex items-center gap-2 bg-[#00D26A] text-black rounded-xl py-2.5 px-4 font-bold text-sm disabled:opacity-50 touch-manipulation min-h-[44px]"
                    >
                        <Save size={16} />
                        Сохранить
                    </button>
                </div>
                <p className="text-[10px] text-[#8B949E]">Текущая дата листинга: <span className="text-[#00E676] font-mono">{savedListingDate ? new Date(savedListingDate).toLocaleString('ru-RU') : '—'}</span></p>
            </div>

            <div className="bento-card rounded-xl p-5">
                <div className="flex items-center gap-2 text-[#00E676] font-bold mb-4">
                    <Coins size={20} />
                    Курс WEVOX
                </div>
                <p className="text-xs text-[#8B949E] mb-2">Начальный курс (при полном пуле): WEVOX за 1 USDT. Фактический курс растёт по мере уменьшения остатка пула.</p>
                <div className="flex gap-2 mb-2">
                    <input
                        type="number"
                        min={0.0001}
                        step={1}
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        className="flex-1 bg-[#111820] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white text-sm"
                    />
                    <button
                        type="button"
                        onClick={handleSaveRate}
                        disabled={loading}
                        className="flex items-center gap-2 bg-[#00D26A] text-black rounded-xl py-2.5 px-4 font-bold text-sm disabled:opacity-50 touch-manipulation min-h-[44px]"
                    >
                        <Save size={16} />
                        Сохранить
                    </button>
                </div>
                <p className="text-[10px] text-[#8B949E]">Начальный курс при полном пуле: 1 USDT = <span className="text-[#00E676] font-bold">{savedRate}</span> WEVOX</p>
            </div>

            <div className="bento-card rounded-xl p-5">
                <div className="flex items-center gap-2 text-[#00E676] font-bold mb-4">
                    <Database size={20} />
                    Объём пула WEVOX
                </div>
                <p className="text-xs text-[#8B949E] mb-2">Всего в пуле (всего доступно к выдаче). Уже выдано: <span className="text-[#00E676] font-mono">{sold.toLocaleString()}</span> WEVOX.</p>
                <div className="flex gap-2 mb-2">
                    <input
                        type="number"
                        min={sold}
                        step={1}
                        value={supply}
                        onChange={(e) => setSupply(e.target.value)}
                        className="flex-1 bg-[#111820] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white text-sm font-mono"
                    />
                    <button
                        type="button"
                        onClick={handleSaveSupply}
                        disabled={loadingSupply}
                        className="flex items-center gap-2 bg-[#00D26A] text-black rounded-xl py-2.5 px-4 font-bold text-sm disabled:opacity-50 touch-manipulation min-h-[44px]"
                    >
                        <Save size={16} />
                        Сохранить
                    </button>
                </div>
                <p className="text-[10px] text-[#8B949E]">Текущий объём пула: <span className="text-[#00E676] font-bold font-mono">{savedSupply.toLocaleString()}</span> WEVOX</p>
            </div>

            <div className="bento-card rounded-xl p-5">
                <div className="font-bold text-white mb-2">Экспорт для airdrop</div>
                <p className="text-xs text-[#8B949E] mb-3">Скачать CSV со списком пользователей и балансами WEVOX (user_id, telegram_id, name, balance_wevox, total_exchanged_usdt, total_exchanged_wevox).</p>
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 btn-secondary text-white rounded-xl py-2.5 px-4 font-semibold text-sm disabled:opacity-50 transition-colors touch-manipulation min-h-[44px]"
                >
                    <Download size={16} />
                    {exporting ? 'Скачивание...' : 'Скачать CSV'}
                </button>
            </div>

            <div className="bento-card rounded-xl p-5">
                <div className="flex items-center gap-2 text-[#00E676] font-bold mb-4">
                    <Ticket size={20} />
                    Промокоды
                </div>
                <p className="text-xs text-[#8B949E] mb-3">Создайте промокод: при активации пользователь получит указанное количество WEVOX (один раз на пользователя). Список использований ограничен.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                    <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Код (напр. PROMO)"
                        className="bg-[#111820] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white text-sm uppercase"
                    />
                    <input
                        type="number"
                        min={0.001}
                        step={1}
                        value={promoAmount}
                        onChange={(e) => setPromoAmount(e.target.value)}
                        placeholder="WEVOX"
                        className="bg-[#111820] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white text-sm"
                    />
                    <input
                        type="number"
                        min={1}
                        value={promoMaxUses}
                        onChange={(e) => setPromoMaxUses(e.target.value)}
                        placeholder="Макс. использований"
                        className="bg-[#111820] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white text-sm"
                    />
                </div>
                <button
                    type="button"
                    onClick={handleCreatePromo}
                    disabled={promoCreating}
                    className="flex items-center gap-2 bg-[#00D26A] text-black rounded-xl py-2.5 px-4 font-bold text-sm disabled:opacity-50 touch-manipulation min-h-[44px]"
                >
                    <Ticket size={16} />
                    {promoCreating ? 'Создание...' : 'Создать промокод'}
                </button>
                {promos.length > 0 && (
                    <div className="mt-4">
                        <div className="text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Список промокодов</div>
                        <ul className="space-y-2 max-h-48 overflow-y-auto thin-scrollbar">
                            {promos.map((p) => (
                                <li key={p.id} className="flex items-center justify-between text-sm bg-[#0D1117] rounded-lg px-3 py-2 border border-[#30363D]">
                                    <span className="font-mono font-bold text-white">{p.code}</span>
                                    <span className="text-[#00E676]">{p.amountZyphex.toLocaleString('en-US', { maximumFractionDigits: 2 })} WEVOX</span>
                                    <span className="text-[#8B949E]">{p.usedCount} / {p.maxUses}</span>
                                    <span className="text-[#8B949E] text-[10px]">{p.createdAt?.slice(0, 10)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {message && (
                <div className={`text-sm ${message.startsWith('Ошибка') ? 'text-[#FF4444]' : 'text-[#00E676]'}`}>
                    {message}
                </div>
            )}
        </div>
    );
}
