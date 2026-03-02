import { create } from 'zustand';

export type Network = 'TON' | 'BSC' | 'TRC' | 'SOL' | 'BTC' | 'ETH';

interface WalletState {
    totalUsd: number;
    expectedDailyIncomeUsd: number;
    expectedDailyPercent: number;
    balances: Record<Network, number>;
    withdrawLimits: {
        minAmount: number;
        maxDailyAmount: number;
        remainingToday: number;
    };
    setBalances: (total: number, networkBalances: Record<Network, number>) => void;
    resetBalances: () => void;
    decrementRemainingLimit: (amount: number) => void;
}

const initialBalances: Record<Network, number> = {
    TON: 0,
    BSC: 0,
    TRC: 0,
    SOL: 0,
    BTC: 0,
    ETH: 0,
};

export const useWalletStore = create<WalletState>((set) => ({
    totalUsd: 0,
    expectedDailyIncomeUsd: 0,
    expectedDailyPercent: 5,
    balances: { ...initialBalances },
    withdrawLimits: {
        minAmount: 50,
        maxDailyAmount: 1000,
        remainingToday: 1000,
    },

    setBalances: (total, networkBalances) => set({
        totalUsd: total,
        balances: networkBalances,
        expectedDailyIncomeUsd: total > 0 ? total * 0.05 : 0
    }),

    resetBalances: () => set({
        totalUsd: 0,
        balances: { ...initialBalances },
        expectedDailyIncomeUsd: 0,
        withdrawLimits: {
            minAmount: 50,
            maxDailyAmount: 1000,
            remainingToday: 1000,
        }
    }),

    decrementRemainingLimit: (amount) => set((state) => ({
        withdrawLimits: {
            ...state.withdrawLimits,
            remainingToday: Math.max(0, state.withdrawLimits.remainingToday - amount)
        }
    }))
}));
