import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export default function HomePage() {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            {/* Сделки Live */}
            {/* Main content placeholder empty to remove fake trades */}
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[#00D26A]/10 flex items-center justify-center text-[#00D26A] mb-4">
                    <CheckCircle2 size={32} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{t('home.title')}</h2>
                <p className="text-[#8B949E] text-sm mb-6">Ожидайте сигналов или перейдите в кошелек для пополнения счета.</p>
            </div>

        </div>
    );
}
