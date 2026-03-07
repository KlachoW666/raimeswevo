import { Users, Copy, Gift, CheckCircle2 } from 'lucide-react';
import { useUserStore, generateRefCode } from '../store/userStore';
import { useTelegram } from '../hooks/useTelegram';
import { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { MockAPI } from '../api/mockServices';

export default function ReferralPage() {
    const { userId, referredBy } = useUserStore();
    const localRefCode = generateRefCode(userId);
    const { hapticFeedback } = useTelegram();
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const [refInfo, setRefInfo] = useState<{ refCode: string; refLink: string; invitedCount: number; totalEarned: number } | null>(null);

    useEffect(() => {
        MockAPI.getReferralInfo().then(setRefInfo);
    }, []);

    const refCode = refInfo?.refCode ?? localRefCode;
    const refLink = refInfo?.refLink ?? `https://t.me/wevoautobot/app?startapp=${localRefCode}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(refLink);
        setCopied(true);
        hapticFeedback?.impactOccurred('light');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6 stagger-children">
            {referredBy && (
                <div className="glass-card rounded-xl px-4 py-3 text-sm text-[#00E676] border-[#00E676]/20">
                    {t('referral.invitedBy')} <span className="font-bold font-mono">{referredBy}</span>
                </div>
            )}

            {/* Hero Card */}
            <div className="glass-card-elevated rounded-2xl p-6 relative overflow-hidden">
                {/* Aurora blurs */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#00E676]/[0.05] blur-[70px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#60A5FA]/[0.04] blur-[50px] rounded-full pointer-events-none" />

                <div className="relative z-10">
                    <h2 className="text-lg font-bold mb-1 text-[#F8FAFC]">{t('referral.title')}</h2>
                    <p className="text-[#64748B] text-xs mb-5">{t('referral.subtitle')}</p>

                    <div className="glass-card rounded-xl flex items-center p-1.5 pl-3.5 mb-4">
                        <div className="truncate text-sm text-[#94A3B8] flex-1 font-mono">{refLink}</div>
                        <button
                            onClick={handleCopy}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ml-2 transition-all duration-300 active:scale-90 shrink-0 ${copied
                                    ? 'glass-card text-[#00E676] border border-[#00E676]/40 shadow-[0_0_12px_rgba(0,230,118,0.2)]'
                                    : 'bg-gradient-to-r from-[#00E676] to-[#00C853] text-black shadow-[0_2px_10px_rgba(0,230,118,0.25)]'
                                }`}
                        >
                            {copied ? <CheckCircle2 size={18} className="animate-scale-in" /> : <Copy size={18} />}
                        </button>
                    </div>

                    <div className="text-center font-mono text-sm font-semibold text-[#94A3B8]">
                        {t('referral.yourCode')} <span className="text-[#00E676] text-shadow-green">{refCode}</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card rounded-xl p-4">
                    <div className="w-9 h-9 rounded-xl bg-[#60A5FA]/10 flex items-center justify-center mb-3">
                        <Users size={16} className="text-[#60A5FA]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#F8FAFC] mb-1">{refInfo?.invitedCount ?? 0}</div>
                    <div className="text-[10px] text-[#64748B] uppercase font-bold leading-tight">{t('referral.invited')}</div>
                    <div className="text-[10px] text-[#64748B] mt-1 opacity-70">{t('referral.clickedLink')}</div>
                </div>

                <div className="glass-card glow-green rounded-xl p-4">
                    <div className="w-9 h-9 rounded-xl bg-[#00E676]/10 flex items-center justify-center mb-3">
                        <Gift size={16} className="text-[#00E676]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#00E676] mb-1 text-shadow-green">+${(refInfo?.totalEarned ?? 0).toFixed(2)}</div>
                    <div className="text-[10px] text-[#64748B] uppercase font-bold leading-tight">{t('referral.earned')}</div>
                    <div className="text-[10px] text-[#64748B] mt-1 opacity-70">{t('referral.fromDeposits')}</div>
                </div>
            </div>

            {/* How it works */}
            <div className="glass-card rounded-xl p-5 text-xs text-[#94A3B8] leading-relaxed">
                <strong className="text-[#F8FAFC] text-sm">{t('referral.howItWorks')}</strong>
                <div className="mt-2">{t('referral.howItWorksDesc')}</div>
            </div>
        </div>
    );
}
