// Global configuration for the application

export const CONFIG = {
    API_BASE: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || '',
    // Array of Telegram User IDs that are granted administrative access.
    // Replace these with your actual Telegram User IDs.
    // Note: User IDs are usually numeric strings, but sometimes can be formatted as 'tg_12345678'.
    ADMIN_IDS: [
        '6976131338',
        '5595447569',
        'tg_6976131338',
        // 'YOUR_TELEGRAM_ID_HERE'
    ],

    // Default mock settings
    DEFAULT_WINRATE_PERCENT: 86.7,
    DEFAULT_TRADE_DELAY_MS: 500,
};
