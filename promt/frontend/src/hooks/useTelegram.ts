export function useTelegram() {
    const tg = window.Telegram?.WebApp;

    return {
        tg,
        user: tg?.initDataUnsafe?.user,
        initData: tg?.initData,
        queryId: tg?.initDataUnsafe?.query_id,
        startParam: tg?.initDataUnsafe?.start_param,
        colorScheme: tg?.colorScheme,
        expand: () => tg?.expand(),
        close: () => tg?.close(),
        ready: () => tg?.ready(),
        hapticFeedback: {
            impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
                if (tg?.isVersionAtLeast?.('6.1') && tg?.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred(style);
                }
            },
            notificationOccurred: (type: 'error' | 'success' | 'warning') => {
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
