import { Shield, Scale, Rocket, Globe, RefreshCcw, LogOut, Loader2, ShieldAlert } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { MockAPI } from '../api/mockServices';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from '../hooks/useTranslation';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
    const { botMode, setBotMode, language, setLanguage, userId, isAdmin } = useUserStore();
    const { hapticFeedback, showConfirm, showAlert } = useTelegram();
    const { t } = useTranslation();
    const [resetting, setResetting] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const navigate = useNavigate();

    const handleModeChange = (mode: 'safe' | 'balanced' | 'aggressive') => {
        setBotMode(mode);
        hapticFeedback?.selectionChanged();
    };

    const handleLangChange = (lang: 'ru' | 'en') => {
        setLanguage(lang);
        hapticFeedback?.selectionChanged();
    };

    const handleReset = () => {
        hapticFeedback?.impactOccurred('medium');
        const msg = t('settings.resetConfirm');

        if (showConfirm) {
            showConfirm(msg, async (isOk) => {
                if (isOk) performReset();
            });
        } else {
            if (window.confirm(msg)) performReset();
        }
    };

    const performReset = async () => {
        setResetting(true);
        // Hardcoded pin verification to simulate modal
        const success = await MockAPI.resetBalance(useUserStore.getState().pin || '');
        setResetting(false);

        if (success) {
            hapticFeedback?.notificationOccurred('success');
            const msg = t('settings.resetSuccess');
            if (showAlert) showAlert(msg);
            else alert(msg);
        } else {
            hapticFeedback?.notificationOccurred('error');
        }
    };

    const handleLogout = async () => {
        hapticFeedback?.impactOccurred('medium');
        const msg = t('settings.logoutConfirm');

        if (showConfirm) {
            showConfirm(msg, async (isOk) => {
                if (isOk) performLogout();
            });
        } else {
            if (window.confirm(msg)) performLogout();
        }
    };

    const performLogout = async () => {
        setLoggingOut(true);
        await MockAPI.logout();
        setLoggingOut(false);
    };

    return (
        <div className="space-y-8 pb-4">
            <section>
                <h3 className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider mb-3">{t('settings.account')}</h3>
                <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 flex justify-between items-center">
                    <div>
                        <div className="text-[#8B949E] text-xs font-bold uppercase mb-1">{t('settings.userId')}</div>
                        <div className="font-mono text-white text-sm">{userId}</div>
                    </div>
                    <button className="text-[#00D26A] text-sm font-semibold hover:underline">{t('settings.changePin')}</button>
                </div>
            </section>

            <section>
                <h3 className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider mb-3">{t('settings.botMode')}</h3>
                <div className="space-y-2">
                    <ModeCard
                        id="safe" title={t('settings.safeMode')} desc={t('settings.safeModeDesc')} icon={Shield}
                        active={botMode === 'safe'} onClick={() => handleModeChange('safe')}
                    />
                    <ModeCard
                        id="balanced" title={t('settings.balancedMode')} desc={t('settings.balancedModeDesc')} icon={Scale}
                        active={botMode === 'balanced'} onClick={() => handleModeChange('balanced')}
                    />
                    <ModeCard
                        id="aggressive" title={t('settings.aggressiveMode')} desc={t('settings.aggressiveModeDesc')} icon={Rocket}
                        active={botMode === 'aggressive'} onClick={() => handleModeChange('aggressive')}
                    />
                </div>
            </section>

            <section>
                <h3 className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Globe size={14} /> {t('settings.language')}
                </h3>
                <div className="flex rounded-xl overflow-hidden bg-[#161B22] border border-[#30363D] p-1">
                    <button
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${language === 'en' ? 'bg-[#00D26A] text-black' : 'text-[#8B949E]'}`}
                        onClick={() => handleLangChange('en')}
                    >
                        English
                    </button>
                    <button
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${language === 'ru' ? 'bg-[#00D26A] text-black' : 'text-[#8B949E]'}`}
                        onClick={() => handleLangChange('ru')}
                    >
                        Русский
                    </button>
                </div>
            </section>

            <section>
                <h3 className="text-[11px] font-bold text-[#FF4444] uppercase tracking-wider mb-3">{t('settings.dangerZone')}</h3>
                <div className="space-y-3">
                    <div className="text-xs text-[#8B949E] mb-2 leading-relaxed">
                        {t('settings.resetDesc')}
                    </div>
                    <button
                        onClick={handleReset}
                        disabled={resetting || loggingOut}
                        className="w-full flex items-center justify-center gap-2 bg-transparent border border-[#00D26A] text-[#00D26A] rounded-xl py-3.5 font-semibold transition-all hover:bg-[#00D26A]/10 active:scale-95 disabled:opacity-50"
                    >
                        {resetting ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
                        {t('settings.resetBtn')}
                    </button>
                    <button
                        onClick={handleLogout}
                        disabled={resetting || loggingOut}
                        className="w-full flex items-center justify-center gap-2 bg-transparent border border-[#FF4444] text-[#FF4444] rounded-xl py-3.5 font-semibold transition-all hover:bg-[#FF4444]/10 active:scale-95 disabled:opacity-50"
                    >
                        {loggingOut ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
                        {t('settings.logout')}
                    </button>
                </div>
            </section>

            {
                isAdmin && (
                    <section className="pt-2">
                        <button
                            onClick={() => {
                                hapticFeedback?.impactOccurred('light');
                                navigate('/admin');
                            }}
                            className="w-full bg-[#1C2333]/30 border border-[#00D26A]/20 hover:border-[#00D26A]/50 rounded-xl p-4 flex items-center gap-4 transition-all group active:scale-[0.98]"
                        >
                            <div className="w-10 h-10 rounded-xl bg-[#00D26A]/10 flex items-center justify-center text-[#00D26A] group-hover:bg-[#00D26A]/20 transition-colors">
                                <ShieldAlert size={20} />
                            </div>
                            <span className="text-[15px] font-bold text-[#00D26A] tracking-wide">{t('settings.adminPanel')}</span>
                        </button>
                    </section>
                )
            }
        </div >
    );
}

function ModeCard({ title, desc, icon: Icon, active, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={`bg-[#161B22] border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all active:scale-[0.98] ${active ? 'border-[#00D26A] shadow-[0_0_15px_rgba(0,210,106,0.1)]' : 'border-[#30363D]'}`}
        >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-[#00D26A] text-black' : 'bg-[#1C2333] text-[#8B949E]'}`}>
                <Icon size={20} />
            </div>
            <div>
                <div className={`text-sm font-semibold mb-1 ${active ? 'text-white' : 'text-[#8B949E]'}`}>{title}</div>
                <div className="text-[10px] text-[#8B949E] opacity-80">{desc}</div>
            </div>
            {active && (
                <div className="ml-auto w-4 h-4 rounded-full bg-[#00D26A] flex items-center justify-center text-black">
                    <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                </div>
            )}
        </div>
    );
}
