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
        const fromStore = useUserStore.getState().referredBy;
        let referredBy = fromStore || undefined;
        if (!referredBy) {
            try {
                const fromSession = sessionStorage.getItem('wevox_ref');
                if (fromSession) referredBy = fromSession.trim().toUpperCase();
            } catch { /* ignore */ }
        }
        try {
            const res = await api.post<{ success: boolean; user?: { id: string; balanceUsdt: number } }>('/api/auth/register', {
                pin,
                confirmPin,
                telegramId,
                username,
                firstName,
                referredBy,
            });
            if (!res.success || !res.user) return false;
            useUserStore.getState().setUserId(res.user.id);
            useUserStore.getState().setAuth(true, pin);
            try { sessionStorage.removeItem('wevox_ref'); } catch { /* ignore */ }
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

    /** Referral info: refCode, refLink, invitedCount, totalEarned */
    async getReferralInfo(): Promise<{ refCode: string; refLink: string; invitedCount: number; totalEarned: number } | null> {
        const userId = useUserStore.getState().userId;
        if (!userId) return null;
        try {
            const res = await api.get<{ refCode: string; refLink: string; invitedCount?: number; totalEarned?: number }>(
                `/api/referral/info?userId=${encodeURIComponent(userId)}`
            );
            return {
                refCode: res.refCode ?? '',
                refLink: res.refLink ?? '',
                invitedCount: res.invitedCount ?? 0,
                totalEarned: res.totalEarned ?? 0,
            };
        } catch {
            return null;
        }
    },

    // --- WALLET ---
    /** Fetch balance from backend — server is source of truth so admin changes (bonus, set balance, reset) are always visible. */
    async fetchBalance(): Promise<void> {
        const userId = useUserStore.getState().userId;
        if (!userId) return;
        try {
            const res = await api.get<{
                totalUsd: number;
                totalDeposited?: number;
                balanceByNetwork: Record<Network, number>;
                referralCount?: number;
                estimatedDailyPercent?: number;
                estimatedDailyIncome?: number;
                withdrawLimits?: { minAmount: number; maxDailyAmount: number; remainingToday: number };
            }>(`/api/wallet/balance?userId=${encodeURIComponent(userId)}`);
            const wallet = useWalletStore.getState();
            wallet.setReferralCount(res.referralCount ?? 0);
            wallet.setBalances(res.totalUsd, res.balanceByNetwork ?? {}, res.totalDeposited ?? 0);
            if (res.withdrawLimits) wallet.setWithdrawLimits(res.withdrawLimits);
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

    async activatePromo(code: string): Promise<{ amountZyphex: number; newBalanceZyphex: number }> {
        const userId = useUserStore.getState().userId;
        if (!userId) throw new Error('not_authenticated');
        const res = await api.post<{ success?: boolean; amountZyphex?: number; newBalanceZyphex?: number; error?: string }>(
            '/api/promo/activate',
            { userId, code: String(code).trim() }
        );
        if (res.error) throw new Error(res.error);
        return {
            amountZyphex: res.amountZyphex!,
            newBalanceZyphex: res.newBalanceZyphex!,
        };
    },

    async getDepositAddress(network: Network): Promise<{ address: string; memo: string }> {
        const userId = useUserStore.getState().userId;
        if (!userId) return { address: '', memo: '' };
        const res = await api.get<{ address: string; memo: string }>(
            `/api/wallet/deposit-address?userId=${encodeURIComponent(userId)}&network=${encodeURIComponent(network)}`
        );
        return { address: res.address ?? '', memo: res.memo ?? '' };
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

    async requestWithdrawal(network: Network, amount: number, address: string): Promise<{ success: boolean; error?: string }> {
        const userId = useUserStore.getState().userId;
        if (!userId) return { success: false, error: 'Необходима авторизация' };
        try {
            const res = await api.post<{ transactionId: string; status: string; newBalance?: number }>('/api/wallet/withdraw', {
                userId,
                network,
                amount,
                address,
            });
            await this.fetchBalance();
            return { success: true };
        } catch (e: unknown) {
            const err = e instanceof Error ? e : null;
            const msg = err?.message ?? '';
            const data = (e as { status?: number; detail?: string })?.detail;
            if (msg === 'insufficient_balance' || /недостаточно|insufficient/i.test(msg)) return { success: false, error: 'Недостаточно средств' };
            if (msg === 'below_min' || /минимальн/i.test(String(data || msg))) return { success: false, error: 'Минимальная сумма вывода $50' };
            if (msg === 'daily_limit_exceeded' || /дневной лимит|daily limit/i.test(String(data || msg))) return { success: false, error: 'Превышен дневной лимит' };
            return { success: false, error: data || msg || 'Ошибка при выводе' };
        }
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


