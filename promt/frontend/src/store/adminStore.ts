import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ====== TYPES ======

export interface MockAppUser {
    id: string;
    name: string;
    balance: number;
    isBanned: boolean;
    registeredAt: string;
    totalDeposited: number;
    totalWithdrawn: number;
    referralCount: number;
    referralEarnings: number;
    lastActive: string;
    botMode: 'safe' | 'balanced' | 'aggressive';
    notes: string;
    vipStatus: boolean;
}

export interface Transaction {
    id: string;
    userId: string;
    userName: string;
    type: 'deposit' | 'withdraw';
    amount: number;
    network: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    address: string;
}

export interface AuditEntry {
    id: string;
    adminId: string;
    action: string;
    details: string;
    timestamp: string;
}

export interface BroadcastMessage {
    id: string;
    text: string;
    audience: 'all' | 'with_balance' | 'vip' | 'custom';
    sentAt: string;
    recipientCount: number;
}

export interface PlatformSettings {
    referralPercent: number;
    minWithdraw: number;
    maxDailyWithdraw: number;
    enabledNetworks: string[];
    defaultLanguage: 'ru' | 'en';
    maintenanceMode: boolean;
    dailyProfitPercent: number;
    winrateByMode: { safe: number; balanced: number; aggressive: number };
    enabledPairs: string[];
    maxConcurrentPairs: number;
    tradingSchedule: { start: string; end: string };
}

// ====== STATE ======

interface AdminState {
    users: MockAppUser[];
    transactions: Transaction[];
    auditLog: AuditEntry[];
    broadcasts: BroadcastMessage[];
    settings: PlatformSettings;

    // User actions
    setUsers: (users: MockAppUser[]) => void;
    updateUserBalance: (id: string, newBalance: number) => void;
    toggleBanUser: (id: string) => void;
    addBonusToUser: (id: string, bonus: number) => void;
    updateUserNotes: (id: string, notes: string) => void;
    toggleVipStatus: (id: string) => void;
    resetUserBalance: (id: string) => void;

    // Transaction actions
    addTransaction: (tx: Omit<Transaction, 'id'>) => void;
    updateTransactionStatus: (id: string, status: Transaction['status']) => void;

    // Audit
    addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void;

    // Broadcast
    addBroadcast: (msg: Omit<BroadcastMessage, 'id' | 'sentAt'>) => void;

    // Settings
    updateSettings: (patch: Partial<PlatformSettings>) => void;
    togglePair: (pair: string) => void;
    toggleNetwork: (network: string) => void;
}

// ====== MOCK DATA ======

const ALL_PAIRS = [
    'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'ADA', 'AVAX', 'TRX', 'DOT',
    'LINK', 'MATIC', 'LTC', 'UNI', 'ATOM', 'ETC', 'XLM', 'NEAR', 'FIL', 'ARB',
    'OP', 'APT', 'SUI', 'SEI', 'TIA', 'STRK', 'PYTH', 'JUP', 'WIF', 'BONK',
    'PEPE', 'SHIB', 'FTM', 'GRT', 'ALGO', 'VET', 'ICP', 'MANA', 'SAND', 'AAVE',
];

const ALL_NETWORKS = ['TON', 'BSC', 'TRC', 'SOL', 'BTC', 'ETH'];

const mockUsers: MockAppUser[] = [];

const mockTransactions: Transaction[] = [];

const mockAudit: AuditEntry[] = [];

const uid = () => Math.random().toString(36).substring(2, 10);

// ====== DEFAULT SETTINGS (used for initial state and rehydration) ======

const defaultSettings: PlatformSettings = {
    referralPercent: 5,
    minWithdraw: 50,
    maxDailyWithdraw: 1000,
    enabledNetworks: [...ALL_NETWORKS],
    defaultLanguage: 'ru',
    maintenanceMode: false,
    dailyProfitPercent: 5,
    winrateByMode: { safe: 50, balanced: 65, aggressive: 85 },
    enabledPairs: [...ALL_PAIRS],
    maxConcurrentPairs: 10,
    tradingSchedule: { start: '00:00', end: '23:59' },
};

// ====== STORE ======

export const useAdminStore = create<AdminState>()(
    persist(
        (set) => ({
            users: mockUsers,
            transactions: mockTransactions,
            auditLog: mockAudit,
            broadcasts: [],
            settings: defaultSettings,

            // ---- Users ----
            setUsers: (users) => set({ users }),
            updateUserBalance: (id, newBalance) => set((s) => ({
        users: s.users.map(u => u.id === id ? { ...u, balance: newBalance } : u)
    })),
    toggleBanUser: (id) => set((s) => ({
        users: s.users.map(u => u.id === id ? { ...u, isBanned: !u.isBanned } : u)
    })),
    addBonusToUser: (id, bonus) => set((s) => ({
        users: s.users.map(u => u.id === id ? { ...u, balance: u.balance + bonus } : u)
    })),
    updateUserNotes: (id, notes) => set((s) => ({
        users: s.users.map(u => u.id === id ? { ...u, notes } : u)
    })),
    toggleVipStatus: (id) => set((s) => ({
        users: s.users.map(u => u.id === id ? { ...u, vipStatus: !u.vipStatus } : u)
    })),
    resetUserBalance: (id) => set((s) => ({
        users: s.users.map(u => u.id === id ? { ...u, balance: 0 } : u)
    })),

    // ---- Transactions ----
    addTransaction: (tx) => set((s) => ({
        transactions: [{ ...tx, id: `tx_${uid()}` }, ...s.transactions]
    })),
    updateTransactionStatus: (id, status) => set((s) => ({
        transactions: s.transactions.map(t => t.id === id ? { ...t, status } : t)
    })),

    // ---- Audit ----
    addAuditEntry: (entry) => set((s) => ({
        auditLog: [{ ...entry, id: `a_${uid()}`, timestamp: new Date().toLocaleString('ru-RU') }, ...s.auditLog]
    })),

    // ---- Broadcast ----
    addBroadcast: (msg) => set((s) => ({
        broadcasts: [{ ...msg, id: `b_${uid()}`, sentAt: new Date().toLocaleString('ru-RU') }, ...s.broadcasts]
    })),

    // ---- Settings ----
    updateSettings: (patch) => set((s) => ({
        settings: { ...s.settings, ...patch }
    })),
    togglePair: (pair) => set((s) => {
        const pairs = s.settings.enabledPairs.includes(pair)
            ? s.settings.enabledPairs.filter(p => p !== pair)
            : [...s.settings.enabledPairs, pair];
        return { settings: { ...s.settings, enabledPairs: pairs } };
    }),
    toggleNetwork: (network) => set((s) => {
        const nets = s.settings.enabledNetworks.includes(network)
            ? s.settings.enabledNetworks.filter(n => n !== network)
            : [...s.settings.enabledNetworks, network];
        return { settings: { ...s.settings, enabledNetworks: nets } };
    }),
        }),
        {
            name: 'zyphex-admin-storage',
            partialize: (state) => ({ settings: state.settings }),
        }
    )
);

export { ALL_PAIRS, ALL_NETWORKS };
