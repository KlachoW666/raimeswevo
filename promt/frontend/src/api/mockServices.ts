import { useUserStore } from '../store/userStore';
import { useWalletStore } from '../store/walletStore';
import type { Network } from '../store/walletStore';
import { api } from './client';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getTelegramUser() {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    return {
        telegramId: tg?.id ? String(tg.id) : '6976131338',
        username: tg?.username as string | undefined,
        firstName: tg?.first_name as string | undefined,
    };
}

export const MockAPI = {
    /** Sync current Telegram user as visitor (everyone who opened the app). */
    async syncVisitor(): Promise<void> {
        const { telegramId, username, firstName } = getTelegramUser();
        await api.post('/api/visitors/sync', { telegramId, username, firstName });
    },

    async checkRegistered(): Promise<boolean> {
        const { telegramId } = getTelegramUser();
        const res = await api.get<{ exists: boolean }>(`/api/auth/check?telegramId=${encodeURIComponent(telegramId)}`);
        return res.exists;
    },

    async register(pin: string, confirmPin: string): Promise<boolean> {
        const { telegramId, username, firstName } = getTelegramUser();
        const referredBy = useUserStore.getState().referredBy;
        try {
            const res = await api.post<{ success: boolean; user?: { id: string; balanceUsdt: number } }>('/api/auth/register', {
                pin,
                confirmPin,
                telegramId,
                username,
                firstName,
                referredBy: referredBy || undefined,
            });
            if (!res.success || !res.user) return false;
            useUserStore.getState().setUserId(res.user.id);
            useUserStore.getState().setAuth(true, pin);
            const wallet = useWalletStore.getState();
            if (wallet.totalUsd === 0 && res.user.balanceUsdt != null) {
                wallet.setBalances(res.user.balanceUsdt, { TON: 0, BSC: 0, TRC: 0, SOL: 0, BTC: 0, ETH: 0, BNB: 0 });
            }
            return true;
        } catch (e: any) {
            throw e;
        }
    },

    async login(pin: string): Promise<boolean> {
        const { telegramId } = getTelegramUser();
        try {
            const res = await api.post<{ success: boolean; user?: { id: string; balanceUsdt: number } }>('/api/auth/login', {
                pin,
                telegramId,
            });
            if (!res.success || !res.user) return false;
            useUserStore.getState().setUserId(res.user.id);
            useUserStore.getState().setAuth(true, pin);
            const wallet = useWalletStore.getState();
            if (wallet.totalUsd === 0 && res.user.balanceUsdt != null) {
                const b = res.user.balanceUsdt;
                wallet.setBalances(b, { TON: b / 3, BSC: b / 3, TRC: b / 3, SOL: 0, BTC: 0, ETH: 0, BNB: 0 });
            }
            return true;
        } catch (e: any) {
            if (e?.message === 'not_registered') throw e;
            if (e?.message === 'wrong_pin') return false;
            throw e;
        }
    },

    async logout(): Promise<void> {
        await delay(300);
        useUserStore.getState().logout();
    },

    // --- WALLET ---
    /** Fetch balance from backend — server is source of truth so admin changes (bonus, set balance, reset) are always visible. */
    async fetchBalance(): Promise<void> {
        const userId = useUserStore.getState().userId;
        if (!userId) return;
        try {
            const res = await api.get<{
                totalUsd: number;
                balanceByNetwork: Record<Network, number>;
                referralCount?: number;
                estimatedDailyPercent?: number;
                estimatedDailyIncome?: number;
            }>(`/api/wallet/balance?userId=${encodeURIComponent(userId)}`);
            const wallet = useWalletStore.getState();
            wallet.setReferralCount(res.referralCount ?? 0);
            wallet.setBalances(res.totalUsd, res.balanceByNetwork ?? {});
        } catch {
            // Silently fail — local store keeps previous values
        }
    },

    /** Save current local balance to backend DB for persistence */
    async syncBalanceToServer(): Promise<void> {
        const userId = useUserStore.getState().userId;
        if (!userId) return;
        const wallet = useWalletStore.getState();
        try {
            await api.post('/api/wallet/sync-balance', {
                userId,
                totalUsd: wallet.totalUsd,
            });
        } catch {
            // Silent — will retry on next sync
        }
    },

    // --- ZYPHEX ---
    async getZyphexRate(): Promise<{ rate: number; remaining?: number; totalSupply?: number; sold?: number }> {
        const res = await api.get<{ rate: number; remaining?: number; totalSupply?: number; sold?: number }>('/api/zyphex/rate');
        return { rate: res.rate ?? 100, remaining: res.remaining, totalSupply: res.totalSupply, sold: res.sold };
    },
    async getZyphexBalance(): Promise<{
        balanceZyphex: number;
        totalExchangedUsdt: number;
        totalExchangedZyphex: number;
        history: { amountUsdt: number; amountZyphex: number; rateUsed: number; createdAt: string }[];
    } | null> {
        const userId = useUserStore.getState().userId;
        if (!userId) return null;
        try {
            return await api.get(`/api/zyphex/balance?userId=${encodeURIComponent(userId)}`);
        } catch {
            return null;
        }
    },
    async exchangeUsdtToZyphex(amountUsdt: number): Promise<{
        newBalanceUsdt: number;
        newBalanceZyphex: number;
        amountZyphex: number;
    }> {
        const userId = useUserStore.getState().userId;
        if (!userId) throw new Error('not_authenticated');
        const res = await api.post<{
            newBalanceUsdt?: number;
            newBalanceZyphex?: number;
            amountZyphex?: number;
            error?: string;
        }>('/api/zyphex/exchange', { userId, amountUsdt });
        if (res.error) throw new Error(res.error);
        return {
            newBalanceUsdt: res.newBalanceUsdt!,
            newBalanceZyphex: res.newBalanceZyphex!,
            amountZyphex: res.amountZyphex!,
        };
    },

    async getDepositAddress(network: Network): Promise<{ address: string; memo: string }> {
        const userId = useUserStore.getState().userId;
        if (!userId) return { address: '', memo: '' };
        try {
            const res = await api.get<{ address: string; memo: string }>(
                `/api/wallet/deposit-address?userId=${encodeURIComponent(userId)}&network=${encodeURIComponent(network)}`
            );
            return { address: res.address, memo: res.memo };
        } catch {
            return { address: '', memo: '' };
        }
    },

    async checkDepositStatus(network: Network): Promise<string> {
        const userId = useUserStore.getState().userId;
        if (!userId) return 'none';
        try {
            const res = await api.get<{ status: string }>(
                `/api/wallet/deposit-status?userId=${encodeURIComponent(userId)}&network=${encodeURIComponent(network)}`
            );
            return res.status;
        } catch {
            return 'none';
        }
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


