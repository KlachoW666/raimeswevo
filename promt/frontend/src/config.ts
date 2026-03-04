// Global configuration for the application

const env = typeof import.meta !== 'undefined' && (import.meta as any).env;

export const CONFIG = {
    API_BASE: (env?.VITE_API_URL as string) || '',
    /** Telegram bot username (no @) for Mini App and referral link. */
    BOT_USERNAME: (env?.VITE_BOT_USERNAME as string) || 'ZyphexAutotraidingBot',
    /** Support contact Telegram username without @; link for «Поддержка» button. */
    SUPPORT_USERNAME: (env?.VITE_SUPPORT_USERNAME as string) || '',
    /** Site domain for display or links (e.g. zyphex.ru). */
    APP_DOMAIN: (env?.VITE_APP_DOMAIN as string) || 'zyphex.ru',
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

    /** ZYPHEX listing date (ISO string). Countdown on Home shows time until this date. */
    ZYPHEX_LISTING_DATE: '2026-04-05T00:00:00.000Z',
};
