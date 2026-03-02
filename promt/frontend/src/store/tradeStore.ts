import { create } from 'zustand';

export interface Trade {
    id: string;
    time: string;
    pair: string;
    pnl: string;
    pnlUsd: string;
    type: 'profit' | 'loss';
}

interface SpeedMetrics {
    latencyNs: number;
    executionsSession: number;
    avgExecutionNs: number;
}

interface TradeState {
    trades: Trade[];
    metrics: SpeedMetrics;
    stats: {
        todayPnl: number;
        weekPnl: number;
        monthPnl: number;
        winRate: number;
        profitTrades: number;
        totalTrades: number;
    };
    globalWinrate: number;
    tradeDelayMs: number;
    addTrade: (trade: Trade, shouldUpdateStats?: boolean, pnlDelta?: number) => void;
    updateMetrics: (metrics: Partial<TradeState['metrics']>) => void;
    incrementExecutions: () => void;
    setGlobalWinrate: (rate: number) => void;
    setTradeDelayMs: (ms: number) => void;
}

export const useTradeStore = create<TradeState>((set) => ({
    trades: [],
    metrics: {
        latencyNs: 800,
        executionsSession: 0,
        avgExecutionNs: 789,
    },
    stats: {
        todayPnl: 0,
        weekPnl: 0,
        monthPnl: 0,
        winRate: 0,
        profitTrades: 0,
        totalTrades: 0,
    },
    globalWinrate: 60,
    tradeDelayMs: 1500,

    addTrade: (trade, shouldUpdateStats = false, pnlDelta = 0) => set((state) => {
        const newTrades = [trade, ...state.trades].slice(0, 50); // Keep last 50

        if (!shouldUpdateStats) {
            return { trades: newTrades };
        }

        const newTotal = state.stats.totalTrades + 1;
        const newProfit = trade.type === 'profit' ? state.stats.profitTrades + 1 : state.stats.profitTrades;

        return {
            trades: newTrades,
            stats: {
                ...state.stats,
                todayPnl: state.stats.todayPnl + pnlDelta,
                weekPnl: state.stats.weekPnl + pnlDelta,
                monthPnl: state.stats.monthPnl + pnlDelta,
                totalTrades: newTotal,
                profitTrades: newProfit,
                winRate: newTotal > 0 ? (newProfit / newTotal) * 100 : 0
            }
        };
    }),

    updateMetrics: (newMetrics) => set((state) => ({
        metrics: { ...state.metrics, ...newMetrics }
    })),

    incrementExecutions: () => set((state) => ({
        metrics: {
            ...state.metrics,
            executionsSession: state.metrics.executionsSession + 1
        }
    })),

    setGlobalWinrate: (rate) => set({ globalWinrate: rate }),
    setTradeDelayMs: (ms) => set({ tradeDelayMs: ms }),
}));
