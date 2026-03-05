import { useState, useEffect } from 'react';
import { Loader2, MessageCircle, Lock } from 'lucide-react';
import { MockAPI } from '../api/mockServices';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from '../hooks/useTranslation';

export default function AuthPage({ onLogin }: { onLogin: () => void }) {
    const [step, setStep] = useState<'welcome' | 'pin'>('welcome');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [isRegistration, setIsRegistration] = useState(false);
    const [activeField, setActiveField] = useState<'pin' | 'confirm'>('pin');
    const [shakeError, setShakeError] = useState(false);
    const [lang, setLang] = useState<'EN' | 'RU'>('RU');

    const { hapticFeedback } = useTelegram();
    const { t } = useTranslation();

    useEffect(() => {
        const waitForTelegram = () =>
            new Promise<void>((resolve) => {
                if (window.Telegram?.WebApp?.initDataUnsafe?.user) return resolve();
                let elapsed = 0;
                const step = 80;
                const max = 400;
                const id = setInterval(() => {
                    elapsed += step;
                    if (window.Telegram?.WebApp?.initDataUnsafe?.user || elapsed >= max) {
                        clearInterval(id);
                        resolve();
                    }
                }, step);
            });
        waitForTelegram()
            .then(() => MockAPI.checkRegistered())
            .then((exists) => setIsRegistration(!exists))
            .catch(() => setIsRegistration(false))
            .finally(() => setChecking(false));
    }, []);

    const triggerError = (msg: string) => {
        setError(msg);
        setShakeError(true);
        hapticFeedback?.notificationOccurred('error');
        setTimeout(() => setShakeError(false), 500);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isRegistration) {
            if (pin.length < 4 || pin.length > 6) {
                triggerError(t('auth.pinLength'));
                return;
            }
            if (pin !== confirmPin) {
                triggerError(t('auth.pinMismatch'));
                setConfirmPin('');
                return;
            }
        } else {
            if (pin.length < 4) return;
        }

        setLoading(true);
        setError('');

        try {
            const success = isRegistration
                ? await MockAPI.register(pin, confirmPin)
                : await MockAPI.login(pin);
            if (success) {
                hapticFeedback?.impactOccurred('medium');
                onLogin();
            } else {
                triggerError(isRegistration ? t('auth.pinMismatch') : t('auth.wrongPin'));
                setPin('');
                setConfirmPin('');
            }
        } catch (e: any) {
            const msg = e?.message;
            if (msg === 'not_registered') {
                setIsRegistration(true);
                setError(t('auth.notRegisteredCreatePin'));
                setPin('');
                setConfirmPin('');
                return;
            }
            triggerError(msg === 'pin_mismatch' ? t('auth.pinMismatch') : msg === 'pin_length' ? t('auth.pinLength') : t('auth.networkError'));
        } finally {
            setLoading(false);
        }
    };

    const currentPin = activeField === 'pin' ? pin : confirmPin;
    const maxDots = 6;

    if (checking) {
        return (
            <div className="min-h-[100dvh] overflow-y-auto overscroll-contain text-white px-6 font-sans aurora-bg" style={{ background: 'linear-gradient(180deg, #0B0F19 0%, #060A13 100%)' }}>
                <div className="flex flex-col items-center justify-center min-h-[100dvh] relative z-10">
                    <Loader2 className="w-10 h-10 text-[#00E676] animate-spin" />
                    <p className="mt-4 text-[#64748B] text-sm">Загрузка...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] overflow-y-auto overscroll-contain text-white px-6 font-sans aurora-bg relative" style={{ background: 'linear-gradient(180deg, #0B0F19 0%, #060A13 100%)' }}>
            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-[#00E676]/[0.04]"
                        style={{
                            width: `${20 + i * 15}px`,
                            height: `${20 + i * 15}px`,
                            top: `${15 + i * 13}%`,
                            left: `${10 + i * 14}%`,
                            animation: `aurora-drift ${12 + i * 3}s ease-in-out infinite alternate`,
                            animationDelay: `${i * -2}s`,
                        }}
                    />
                ))}
            </div>

            {/* Top Bar for PIN step */}
            {step === 'pin' && (
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                    <button className="flex items-center gap-2 bg-[#1A1F2A] hover:bg-[#2A3140] px-4 py-2 rounded-xl text-sm text-[#8B949E] transition-colors">
                        <MessageCircle size={16} /> Поддержка
                    </button>
                    <div className="flex bg-[#1A1F2A] rounded-xl p-1">
                        <button
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${lang === 'EN' ? 'bg-[#00E676] text-black font-semibold' : 'text-[#8B949E]'}`}
                            onClick={() => setLang('EN')}
                        >EN</button>
                        <button
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${lang === 'RU' ? 'bg-[#00E676] text-black font-semibold' : 'text-[#8B949E]'}`}
                            onClick={() => setLang('RU')}
                        >RU</button>
                    </div>
                </div>
            )}

            <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] w-full max-w-[320px] animate-slide-up py-8">
                {step === 'welcome' && (
                    <div className="w-full text-center mt-6">
                        <div className="mb-8 flex justify-center">
                            <div className="text-3xl font-bold tracking-tight">
                                <span className="text-white">Alpha</span><span className="text-[#00E676]">Engine</span>
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold mb-3 leading-tight text-white">
                            Добро пожаловать в Alpha Engine
                        </h1>
                        <p className="text-[#64748B] text-sm mb-8 px-2">
                            Создайте аккаунт для начала торговли.
                        </p>

                        <div className="bg-[#1A1F2A] p-5 rounded-2xl mb-8 border border-white/5 text-left">
                            <p className="text-[#8B949E] text-[13px] leading-relaxed mb-4">
                                Автоматический торговый бот. Пополните баланс USDT (BSC или TRC) — бот торгует за вас. Включайте и отключайте торговлю когда угодно, выводите на свой кошелёк.
                            </p>
                            <ul className="space-y-3 text-[13px] text-[#A1ABB9]">
                                <li className="flex items-center gap-2.5">
                                    <span className="text-[#00E676] text-lg">⚡</span> Автоторговля 24/7
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="text-[#00E676] text-lg">💳</span> Пополнение и вывод USDT в сетях BSC и TRC
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="text-[#00E676] text-lg">👥</span> Заработок с рефералов при пополнении друзьями
                                </li>
                            </ul>
                        </div>

                        <div className="text-[11px] text-[#64748B] mb-4">@DevCloude</div>

                        <button
                            onClick={() => setStep('pin')}
                            className="w-full bg-[#00E676] text-black font-bold rounded-2xl py-4 transition-all active:scale-95 shadow-[0_4px_20px_rgba(0,230,118,0.2)]"
                        >
                            Создать аккаунт
                        </button>
                    </div>
                )}

                {step === 'pin' && (
                    <div className="w-full flex flex-col items-center">
                        <div className="text-[13px] font-bold text-white mb-6">
                            Аккаунт: @DevCloude
                        </div>

                        <div className="w-16 h-16 bg-[#162220] rounded-2xl border border-[#00E676]/20 flex items-center justify-center mb-6">
                            <Lock className="text-[#00E676] w-8 h-8 opacity-90" />
                        </div>

                        <h1 className="text-2xl font-bold mb-2 tracking-tight">
                            {isRegistration ? t('auth.createPin') : t('auth.enterPin')}
                        </h1>
                        <p className="text-[#64748B] text-sm mb-8 text-center leading-relaxed">
                            {error ? <span className="text-[#FF5252] text-shadow-red">{error}</span> : (isRegistration ? t('auth.createPinDesc') : t('auth.enterPinDesc'))}
                        </p>

                        {/* PIN Dot Indicators */}
                        <div className={`flex gap-3 mb-3 ${shakeError ? 'animate-shake' : ''}`}>
                            {[...Array(maxDots)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${i < currentPin.length
                                        ? error
                                            ? 'bg-[#FF5252] border-[#FF5252] shadow-[0_0_8px_rgba(255,82,82,0.5)]'
                                            : 'bg-[#00E676] border-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.5)] scale-110'
                                        : 'bg-transparent border-[#64748B]/40'
                                        }`}
                                />
                            ))}
                        </div>

                        {isRegistration && (
                            <div className="text-[10px] text-[#64748B] uppercase tracking-widest mb-2 font-bold">
                                {activeField === 'pin' ? t('auth.pinPlaceholder') : t('auth.confirmPin')}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="w-full">
                            {/* Hidden real inputs for keyboard handling */}
                            <input
                                type="password"
                                className="absolute opacity-0 w-0 h-0"
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
                                autoFocus={activeField === 'pin'}
                                disabled={loading}
                                onFocus={() => setActiveField('pin')}
                            />
                            {isRegistration && (
                                <input
                                    type="password"
                                    className="absolute opacity-0 w-0 h-0"
                                    value={confirmPin}
                                    onChange={(e) => {
                                        if (/^\d*$/.test(e.target.value)) {
                                            setConfirmPin(e.target.value);
                                            setError('');
                                        }
                                    }}
                                    maxLength={6}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    disabled={loading}
                                    onFocus={() => setActiveField('confirm')}
                                />
                            )}

                            {/* Visible styled input to receive focus */}
                            <input
                                type="password"
                                placeholder={activeField === 'pin' ? t('auth.pinPlaceholder') : t('auth.confirmPin')}
                                className={`w-full glass-card ${error ? 'border-[#FF5252]/50 glow-red' : 'border-white/[0.08] focus:border-[#00E676]/40'} rounded-2xl px-4 py-4 text-center text-3xl font-mono tracking-[0.8em] text-white placeholder:text-[#64748B]/30 focus:outline-none transition-all duration-300 mb-6 disabled:opacity-40`}
                                value={activeField === 'pin' ? pin : confirmPin}
                                onChange={(e) => {
                                    if (/^\d*$/.test(e.target.value)) {
                                        if (activeField === 'pin') {
                                            setPin(e.target.value);
                                        } else {
                                            setConfirmPin(e.target.value);
                                        }
                                        setError('');
                                    }
                                }}
                                maxLength={6}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoFocus
                                disabled={loading}
                            />

                            {isRegistration && pin.length >= 4 && activeField === 'pin' && (
                                <button
                                    type="button"
                                    onClick={() => setActiveField('confirm')}
                                    className="w-full bg-[#18644A] hover:bg-[#1E7D5C] border border-[#00E676]/20 text-white font-medium rounded-2xl py-4 transition-all active:scale-95 mb-4 text-[15px]"
                                >
                                    {t('auth.confirmPin')}
                                </button>
                            )}

                            <button
                                type="submit"
                                disabled={loading || (isRegistration ? pin.length < 4 || confirmPin.length < 4 : pin.length < 4)}
                                className="w-full bg-[#00E676] hover:bg-[#00C853] text-black font-semibold rounded-2xl py-4 transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 flex justify-center items-center shadow-[0_4px_20px_rgba(0,230,118,0.2)]"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : (isRegistration ? 'Создать пин-код' : t('auth.login'))}
                            </button>

                            <button type="button" className="w-full mt-4 flex items-center justify-center gap-2 bg-[#1A1F2A] hover:bg-[#2A3140] px-4 py-4 rounded-2xl text-[15px] text-white transition-colors border border-white/5">
                                <MessageCircle size={18} className="opacity-70" /> Поддержка
                            </button>
                        </form>
                    </div>
                )}
            </div>
            {/* Added Zyphex Tagline */}
            {step === 'welcome' && (
                <div className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-[#64748B]">
                    @AlphaEngineTradingBot
                </div>
            )}
        </div>
    );
}
