import { Shield, Scale, Rocket, Globe, RefreshCcw, LogOut, Loader2, ShieldAlert } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { MockAPI } from '../api/mockServices';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from '../hooks/useTranslation';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MODE_ACCENTS = {
    safe: { color: '#00E676', bgClass: 'bg-[#00E676]', bgDim: 'bg-[#00E676]/10', borderClass: 'border-[#00E676]/40', glowClass: 'shadow-[0_0_20px_rgba(0,230,118,0.12)]' },
    balanced: { color: '#60A5FA', bgClass: 'bg-[#60A5FA]', bgDim: 'bg-[#60A5FA]/10', borderClass: 'border-[#60A5FA]/40', glowClass: 'shadow-[0_0_20px_rgba(96,165,250,0.12)]' },
    aggressive: { color: '#FF5252', bgClass: 'bg-[#FF5252]', bgDim: 'bg-[#FF5252]/10', borderClass: 'border-[#FF5252]/40', glowClass: 'shadow-[0_0_20px_rgba(255,82,82,0.12)]' },
};

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
        <div className="space-y-8 pb-4 stagger-children">
            {/* Account */}
            <section>
                <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3">{t('settings.account')}</h3>
                <div className="bento-card rounded-[14px] p-4 flex justify-between items-center">
                    <div>
                        <div className="text-[#64748B] text-xs font-bold uppercase mb-1">{t('settings.userId')}</div>
                        <div className="font-mono text-[#F1F5F9] text-sm">{userId}</div>
                    </div>
                    <button className="text-[#00E676] text-sm font-semibold hover:underline transition-colors">{t('settings.changePin')}</button>
                </div>
            </section>

            {/* Bot Mode */}
            <section>
                <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3">{t('settings.botMode')}</h3>
                <div className="space-y-2.5">
                    <ModeCard
                        id="safe" title={t('settings.safeMode')} desc={t('settings.safeModeDesc')} icon={Shield}
                        active={botMode === 'safe'} onClick={() => handleModeChange('safe')} accents={MODE_ACCENTS.safe}
                    />
                    <ModeCard
                        id="balanced" title={t('settings.balancedMode')} desc={t('settings.balancedModeDesc')} icon={Scale}
                        active={botMode === 'balanced'} onClick={() => handleModeChange('balanced')} accents={MODE_ACCENTS.balanced}
                    />
                    <ModeCard
                        id="aggressive" title={t('settings.aggressiveMode')} desc={t('settings.aggressiveModeDesc')} icon={Rocket}
                        active={botMode === 'aggressive'} onClick={() => handleModeChange('aggressive')} accents={MODE_ACCENTS.aggressive}
                    />
                </div>
            </section>

            {/* Language */}
            <section>
                <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Globe size={14} /> {t('settings.language')}
                </h3>
                <div className="flex bento-card rounded-[14px] overflow-hidden p-1">
                    <button
                        className={`flex-1 py-2.5 text-sm font-bold rounded-[10px] transition-all duration-200 ${language === 'en' ? 'btn-primary' : 'text-[#64748B] hover:text-[#94A3B8]'}`}
                        onClick={() => handleLangChange('en')}
                    >
                        English
                    </button>
                    <button
                        className={`flex-1 py-2.5 text-sm font-bold rounded-[10px] transition-all duration-200 ${language === 'ru' ? 'btn-primary' : 'text-[#64748B] hover:text-[#94A3B8]'}`}
                        onClick={() => handleLangChange('ru')}
                    >
                        Русский
                    </button>
                </div>
            </section>

            {/* Danger Zone */}
            <section>
                <h3 className="text-[11px] font-bold text-[#FF5252] uppercase tracking-wider mb-3">{t('settings.dangerZone')}</h3>
                <div className="bento-card rounded-[14px] p-4 border-[#FF5252]/10 space-y-3">
                    <div className="text-xs text-[#64748B] leading-relaxed">{t('settings.resetDesc')}</div>
                    <button
                        onClick={handleReset}
                        disabled={resetting || loggingOut}
                        className="btn-secondary w-full flex items-center justify-center gap-2 border-[#00E676]/30 text-[#00E676] py-3.5 disabled:opacity-40"
                    >
                        {resetting ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
                        {t('settings.resetBtn')}
                    </button>
                    <button
                        onClick={handleLogout}
                        disabled={resetting || loggingOut}
                        className="btn-secondary w-full flex items-center justify-center gap-2 border-[#FF5252]/30 text-[#FF5252] py-3.5 disabled:opacity-40"
                    >
                        {loggingOut ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
                        {t('settings.logout')}
                    </button>
                </div>
            </section>

            {isAdmin && (
                <section className="pt-2">
                    <button
                        onClick={() => {
                            hapticFeedback?.impactOccurred('light');
                            navigate('/admin');
                        }}
                        className="w-full bento-card border-[#00E676]/20 hover:border-[#00E676]/40 rounded-[14px] p-4 flex items-center gap-4 transition-all group active:scale-[0.98]"
                    >
                        <div className="w-11 h-11 rounded-xl bg-[#00E676]/10 flex items-center justify-center text-[#00E676] group-hover:bg-[#00E676]/15 transition-all animate-pulse-glow">
                            <ShieldAlert size={20} />
                        </div>
                        <span className="text-[15px] font-bold text-[#00E676] tracking-wide text-shadow-green">{t('settings.adminPanel')}</span>
                    </button>
                </section>
            )}
        </div>
    );
}

function ModeCard({ title, desc, icon: Icon, active, onClick, accents }: any) {
    return (
        <div
            onClick={onClick}
            className={`bento-card rounded-[14px] p-4 flex items-center gap-4 cursor-pointer transition-all duration-200 active:scale-[0.98] ${active ? `${accents.borderClass} ${accents.glowClass}` : 'border-white/[0.06]'}`}
        >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${active ? `${accents.bgClass} text-black` : 'bg-[#111820] text-[#64748B]'}`}>
                <Icon size={20} />
            </div>
            <div className="flex-1">
                <div className={`text-sm font-semibold mb-1 transition-colors duration-200 ${active ? 'text-[#F1F5F9]' : 'text-[#94A3B8]'}`}>{title}</div>
                <div className="text-[10px] text-[#64748B]">{desc}</div>
            </div>
            {active && (
                <div className={`w-4 h-4 rounded-full ${accents.bgClass} flex items-center justify-center animate-scale-in`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-black" />
                </div>
            )}
        </div>
    );
}
