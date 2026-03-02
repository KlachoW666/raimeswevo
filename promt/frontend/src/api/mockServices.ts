import { useUserStore } from '../store/userStore';
import { useWalletStore } from '../store/walletStore';
import type { Network } from '../store/walletStore';

// Delay helper to simulate network request
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const MockAPI = {
    // --- AUTH ---
    async login(pin: string): Promise<boolean> {
        await delay(800);
        if (pin === '0000') return false; // Mock failed PIN

        // If login implies setting existing data, we mock fetching wallet state
        const wallet = useWalletStore.getState();
        if (wallet.totalUsd === 0) {
            wallet.setBalances(500, {
                TON: 150,
                BSC: 200,
                TRC: 150,
                SOL: 0,
                BTC: 0,
                ETH: 0
            });
        }
        useUserStore.getState().setAuth(true, pin);
        return true;
    },

    async logout(): Promise<void> {
        await delay(300);
        useUserStore.getState().logout();
    },

    // --- WALLET ---
    async getDepositAddress(network: Network): Promise<string> {
        await delay(500);
        const mockAddresses: Record<Network, string> = {
            TON: 'UQBp1K9mKVQf8...yZ-vM1R_',
            BSC: '0x71C...976F',
            TRC: 'TWM...kP8a',
            SOL: '6Jv...9wR1',
            BTC: 'bc1...m9Pq',
            ETH: '0x88f...1a4A',
        };
        return mockAddresses[network];
    },

    async requestWithdrawal(network: Network, amount: number, _address: string): Promise<{ success: boolean; error?: string }> {
        await delay(1200);
        const store = useWalletStore.getState();

        if (amount < store.withdrawLimits.minAmount) {
            return { success: false, error: `Минимальная сумма вывода $${store.withdrawLimits.minAmount}` };
        }
        if (amount > store.withdrawLimits.remainingToday) {
            return { success: false, error: `Превышен дневной лимит (${store.withdrawLimits.remainingToday} USDT осталось)` };
        }
        if (amount > store.balances[network]) {
            return { success: false, error: `Недостаточно средств в сети ${network}` };
        }

        // Success simulation
        store.decrementRemainingLimit(amount);

        const newBalances = { ...store.balances };
        newBalances[network] -= amount;
        store.setBalances(store.totalUsd - amount, newBalances);

        return { success: true };
    },

    // --- SETTINGS ---
    async resetBalance(confirmPin: string): Promise<boolean> {
        await delay(1000);
        const state = useUserStore.getState();
        if (confirmPin !== state.pin) return false;

        useWalletStore.getState().resetBalances();
        return true;
    }
};


