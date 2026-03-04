import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Network = 'TON' | 'BSC' | 'TRC' | 'SOL' | 'BTC' | 'ETH' | 'BNB';

const BASE_DAILY_PERCENT = 3;
const REFERRAL_BONUS_PERCENT = 0.02;

function dailyPercentFromReferrals(referralCount: number) {
    return BASE_DAILY_PERCENT + referralCount * REFERRAL_BONUS_PERCENT;
}

interface WalletState {
    totalUsd: number;
    expectedDailyIncomeUsd: number;
    expectedDailyPercent: number;
    referralCount: number;
    balances: Record<Network, number>;
    withdrawLimits: {
        minAmount: number;
        maxDailyAmount: number;
        remainingToday: number;
    };
    setBalances: (total: number, networkBalances: Record<Network, number>) => void;
    setReferralCount: (count: number) => void;
    setWithdrawLimits: (limits: { minAmount: number; maxDailyAmount: number; remainingToday: number }) => void;
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
    BNB: 0,
};

export const useWalletStore = create<WalletState>()(
    persist(
        (set) => ({
            totalUsd: 0,
            expectedDailyIncomeUsd: 0,
            expectedDailyPercent: BASE_DAILY_PERCENT,
            referralCount: 0,
            balances: { ...initialBalances },
            withdrawLimits: {
                minAmount: 50,
                maxDailyAmount: 1000,
                remainingToday: 1000,
            },

            setBalances: (total, networkBalances) => set((state) => {
                const pct = dailyPercentFromReferrals(state.referralCount);
                return {
                    totalUsd: total,
                    balances: networkBalances,
                    expectedDailyPercent: pct,
                    expectedDailyIncomeUsd: total > 0 ? total * (pct / 100) : 0,
                };
            }),

            setReferralCount: (count) => set((state) => {
                const pct = dailyPercentFromReferrals(count);
                return {
                    referralCount: count,
                    expectedDailyPercent: pct,
                    expectedDailyIncomeUsd: state.totalUsd > 0 ? state.totalUsd * (pct / 100) : 0,
                };
            }),

            setWithdrawLimits: (limits) => set(() => ({
                withdrawLimits: {
                    minAmount: limits.minAmount,
                    maxDailyAmount: limits.maxDailyAmount,
                    remainingToday: limits.remainingToday,
                },
            })),

            resetBalances: () => set({
                totalUsd: 0,
                balances: { ...initialBalances },
                expectedDailyIncomeUsd: 0,
                expectedDailyPercent: BASE_DAILY_PERCENT,
                referralCount: 0,
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
        }),
        {
            name: 'zyphex-wallet-storage',
        }
    )
);
