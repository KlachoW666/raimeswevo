import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MockAPI } from '../api/mockServices';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from '../hooks/useTranslation';
import { useUserStore } from '../store/userStore';

export default function AuthPage({ onLogin }: { onLogin: () => void }) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { hapticFeedback } = useTelegram();
    const { t } = useTranslation();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length < 4) return;

        setLoading(true);
        setError('');

        try {
            const success = await MockAPI.login(pin);
            if (success) {
                hapticFeedback?.impactOccurred('medium');

                // Set User ID from Telegram Context, or fallback for external browser testing
                const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
                const newUserId = tgUser?.id ? tgUser.id.toString() : 'tg_6976131338';
                useUserStore.getState().setUserId(newUserId);

                onLogin();
            } else {
                hapticFeedback?.notificationOccurred('error');
                setError(t('auth.wrongPin'));
                setPin('');
            }
        } catch {
            setError(t('auth.networkError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#0D1117] text-white px-6 font-sans">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors duration-500 overflow-hidden ${error ? 'bg-[#FF4444]/20' : 'bg-[#00D26A]/20'}`}>
                <img src="/logo.svg" alt="Zyphex Logo" className={`w-10 h-10 object-contain transition-transform duration-500 ${error ? 'scale-110' : 'scale-100'}`} />
            </div>

            <h1 className="text-2xl font-semibold mb-2">{t('auth.enterPin')}</h1>
            <p className="text-[#8B949E] text-sm mb-8 text-center max-w-xs leading-relaxed">
                {error ? <span className="text-[#FF4444]">{error}</span> : t('auth.enterPinDesc')}
            </p>

            <form onSubmit={handleLogin} className="w-full max-w-[280px]">
                <input
                    type="password"
                    placeholder={t('auth.pinPlaceholder')}
                    className={`w-full bg-[#1C2333] border ${error ? 'border-[#FF4444]' : 'border-[#30363D] focus:border-[#00D26A]'} rounded-xl px-4 py-4 text-center text-3xl font-mono tracking-[1em] text-white placeholder:text-[#8B949E]/30 focus:outline-none transition-colors mb-6 disabled:opacity-50`}
                    value={pin}
                    onChange={(e) => {
                        if (/^\d*$/.test(e.target.value)) {
                            setPin(e.target.value);
                            setError('');
                        }
                    }}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={pin.length < 4 || loading}
                    className="w-full bg-[#00D26A] text-black font-bold uppercase tracking-wide rounded-xl py-4 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : t('auth.login')}
                </button>
            </form>
        </div>
    );
}
