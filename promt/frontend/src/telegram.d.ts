/* Global type declarations for Telegram WebApp */

interface TelegramWebApp {
    ready: () => void;
    expand: () => void;
    close: () => void;
    initData: string;
    initDataUnsafe: {
        user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
        };
        start_param?: string;
        query_id?: string;
    };
    colorScheme: 'light' | 'dark';
    isVersionAtLeast: (version: string) => boolean;
    HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
    };
    showAlert: (message: string, callback?: () => void) => void;
    showConfirm: (message: string, callback?: (isOk: boolean) => void) => void;
    setHeaderColor: (color: string) => void;
    setBackgroundColor: (color: string) => void;
}

interface Window {
    Telegram?: {
        WebApp?: TelegramWebApp;
    };
}
