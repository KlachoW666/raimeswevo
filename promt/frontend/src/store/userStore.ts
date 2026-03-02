import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CONFIG } from '../config';

interface UserState {
    isAuthenticated: boolean;
    pin: string | null;
    userId: string;
    refCode: string;
    botMode: 'safe' | 'balanced' | 'aggressive';
    language: 'ru' | 'en';
    isAdmin: boolean;
    setAuth: (status: boolean, pin?: string) => void;
    setBotMode: (mode: 'safe' | 'balanced' | 'aggressive') => void;
    setLanguage: (lang: 'ru' | 'en') => void;
    logout: () => void;
    setUserId: (id: string) => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            pin: null,
            userId: 'tg_6976131338',
            refCode: 'V37DEPE2',
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
        }),
        {
            name: 'zyphex-user-storage',
        }
    )
);
