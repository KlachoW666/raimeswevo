import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CONFIG } from '../config';

/** Unique 6–8 char referral code from Telegram user id (deterministic). */
export function generateRefCode(userId: string): string {
    const num = parseInt(userId.replace(/\D/g, ''), 10) || 0;
    const s = num.toString(36).toUpperCase();
    return s.length >= 6 ? s.slice(0, 8) : s.padStart(6, 'X');
}

interface UserState {
    isAuthenticated: boolean;
    pin: string | null;
    userId: string;
    referredBy: string | null;
    botMode: 'safe' | 'balanced' | 'aggressive';
    language: 'ru' | 'en';
    isAdmin: boolean;
    setAuth: (status: boolean, pin?: string) => void;
    setBotMode: (mode: 'safe' | 'balanced' | 'aggressive') => void;
    setLanguage: (lang: 'ru' | 'en') => void;
    logout: () => void;
    setUserId: (id: string) => void;
    setReferredBy: (param: string | null) => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            pin: null,
            userId: 'tg_6976131338',
            referredBy: null,
            botMode: 'balanced',
            language: 'ru',
            isAdmin: true, // Defaulting to true for 'tg_6976131338' matching ADMINID
            setAuth: (status, pin) => set((state) => ({
                isAuthenticated: status,
                pin: pin || state.pin
            })),
            setBotMode: (mode) => set({ botMode: mode }),
            setLanguage: (lang) => set({ language: lang }),
            logout: () => set({ isAuthenticated: false, pin: null }),
            setUserId: (id) => set({ userId: id, isAdmin: CONFIG.ADMIN_IDS.includes(id) }),
            setReferredBy: (param) => set({ referredBy: param }),
        }),
        {
            name: 'wevox-user-storage',
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                pin: state.pin,
                userId: state.userId,
                botMode: state.botMode,
                language: state.language,
                isAdmin: state.isAdmin,
            }),
        }
    )
);
