import { Users, Copy, Gift, CheckCircle2 } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useTelegram } from '../hooks/useTelegram';
import { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

export default function ReferralPage() {
    const { refCode } = useUserStore();
    const { hapticFeedback } = useTelegram();
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const botUsername = 'ZyphexAutotraidingBot';
    const refLink = `https://t.me/${botUsername}/app?startapp=${refCode}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(refLink);
        setCopied(true);
        hapticFeedback?.impactOccurred('light');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#161B22] to-[#0D1117] border border-[#30363D] rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D26A]/5 blur-[60px] rounded-full"></div>

                <h2 className="text-lg font-semibold mb-1 relative z-10">{t('referral.title')}</h2>
                <p className="text-[#8B949E] text-xs mb-4 relative z-10">{t('referral.subtitle')}</p>

                <div className="bg-[#1C2333] border border-[#30363D] rounded-xl flex items-center p-1 pl-3 mb-3 relative z-10">
                    <div className="truncate text-sm text-[#8B949E] flex-1 font-mono">{refLink}</div>
                    <button
                        onClick={handleCopy}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ml-2 transition-all active:scale-95 shrink-0 ${copied ? 'bg-[#1C2333] text-[#00D26A] border border-[#00D26A]' : 'bg-[#00D26A] text-black'
                            }`}
                    >
                        {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                    </button>
                </div>

                <div className="text-center font-mono text-sm font-semibold text-white relative z-10">
                    {t('referral.yourCode')} <span className="text-[#00D26A]">{refCode}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
                    <div className="w-8 h-8 rounded-full bg-[#1C2333] flex items-center justify-center mb-3">
                        <Users size={16} className="text-[#8B949E]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white mb-1">0</div>
                    <div className="text-[10px] text-[#8B949E] uppercase font-bold leading-tight">{t('referral.invited')}</div>
                    <div className="text-[10px] text-[#8B949E] mt-1 opacity-70">{t('referral.clickedLink')}</div>
                </div>

                <div className="bg-[#161B22] border border-[#00D26A]/30 rounded-xl p-4 shadow-[0_0_15px_rgba(0,210,106,0.05)]">
                    <div className="w-8 h-8 rounded-full bg-[#00D26A]/10 flex items-center justify-center mb-3">
                        <Gift size={16} className="text-[#00D26A]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#00D26A] mb-1">+$0.00</div>
                    <div className="text-[10px] text-[#8B949E] uppercase font-bold leading-tight">{t('referral.earned')}</div>
                    <div className="text-[10px] text-[#8B949E] mt-1 opacity-70">{t('referral.fromDeposits')}</div>
                </div>
            </div>

            <div className="text-xs text-[#8B949E] bg-[#161B22] p-4 rounded-xl border border-[#30363D] leading-relaxed">
                <strong className="text-white">{t('referral.howItWorks')}</strong> {t('referral.howItWorksDesc')}
            </div>
        </div>
    );
}
