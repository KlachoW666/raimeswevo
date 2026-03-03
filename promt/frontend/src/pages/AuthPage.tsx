import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { MockAPI } from '../api/mockServices';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from '../hooks/useTranslation';

export default function AuthPage({ onLogin }: { onLogin: () => void }) {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [isRegistration, setIsRegistration] = useState(false);
    const [activeField, setActiveField] = useState<'pin' | 'confirm'>('pin');
    const [shakeError, setShakeError] = useState(false);

    const { hapticFeedback } = useTelegram();
    const { t } = useTranslation();

    useEffect(() => {
        MockAPI.checkRegistered()
            .then((exists) => {
                setIsRegistration(!exists);
            })
            .catch(() => setIsRegistration(true))
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

            <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] w-full max-w-[320px] animate-slide-up py-8">
                {/* Logo with glow rings */}
                <div className="relative mb-8">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center overflow-hidden transition-colors duration-500 ${error ? 'bg-[#FF5252]/15' : 'bg-[#00E676]/10'}`}>
                        <img src="/logo.svg" alt="Zyphex Logo" className={`w-12 h-12 object-contain transition-transform duration-500 ${error ? 'scale-110' : 'scale-100'}`} />
                    </div>
                    <div className={`absolute inset-0 rounded-full transition-all duration-500 ${error ? 'shadow-[0_0_30px_rgba(255,82,82,0.3)]' : 'shadow-[0_0_30px_rgba(0,230,118,0.25)]'}`} />
                    <div className={`absolute -inset-2 rounded-full border transition-all duration-500 ${error ? 'border-[#FF5252]/20' : 'border-[#00E676]/15'}`} />
                    <div className={`absolute -inset-4 rounded-full border transition-all duration-500 ${error ? 'border-[#FF5252]/10' : 'border-[#00E676]/8'}`} />
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
                            className="w-full glass-card text-[#00E676] font-bold uppercase tracking-wide rounded-2xl py-4 transition-all active:scale-95 mb-3 text-sm"
                        >
                            {t('auth.confirmPin')} →
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={loading || (isRegistration ? pin.length < 4 || confirmPin.length < 4 : pin.length < 4)}
                        className="w-full bg-gradient-to-r from-[#00E676] to-[#00C853] text-black font-bold uppercase tracking-wide rounded-2xl py-4 transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 flex justify-center items-center shadow-[0_4px_20px_rgba(0,230,118,0.25)]"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (isRegistration ? t('auth.createAccount') : t('auth.login'))}
                    </button>
                </form>
            </div>
        </div>
    );
}
