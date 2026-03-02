import type { WebAppUser } from '@twa-dev/types';

export function useTelegram() {
    const tg = (window as any).Telegram?.WebApp;

    return {
        tg,
        user: tg?.initDataUnsafe?.user as WebAppUser | undefined,
        initData: tg?.initData,
        queryId: tg?.initDataUnsafe?.query_id,
        colorScheme: tg?.colorScheme,
        expand: () => tg?.expand(),
        close: () => tg?.close(),
        ready: () => tg?.ready(),
        hapticFeedback: {
            impactOccurred: (style: any) => {
                if (tg?.isVersionAtLeast?.('6.1') && tg?.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred(style);
                }
            },
            notificationOccurred: (type: any) => {
                if (tg?.isVersionAtLeast?.('6.1') && tg?.HapticFeedback) {
                    tg.HapticFeedback.notificationOccurred(type);
                }
            },
            selectionChanged: () => {
                if (tg?.isVersionAtLeast?.('6.1') && tg?.HapticFeedback) {
                    tg.HapticFeedback.selectionChanged();
                }
            }
        },
        showAlert: (message: string) => {
            if (tg?.isVersionAtLeast?.('6.2') && tg?.showAlert) {
                tg.showAlert(message);
            } else {
                alert(message);
            }
        },
        showConfirm: (message: string, callback?: (isOk: boolean) => void) => {
            if (tg?.isVersionAtLeast?.('6.2') && tg?.showConfirm) {
                tg.showConfirm(message, callback);
            } else {
                const isOk = window.confirm(message);
                if (callback) callback(isOk);
            }
        },
    };
}
