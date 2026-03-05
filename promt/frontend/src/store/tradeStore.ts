import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        todayDate: string; // to reset daily stats
    };
    globalWinrate: number;
    tradeDelayMs: number;
    isTradingActive: boolean;
    boostEndTime: number | null;
    addTrade: (trade: Trade, shouldUpdateStats?: boolean, pnlDelta?: number) => void;
    updateMetrics: (metrics: Partial<TradeState['metrics']>) => void;
    incrementExecutions: () => void;
    setGlobalWinrate: (rate: number) => void;
    setTradeDelayMs: (ms: number) => void;
    toggleTrading: () => void;
    activateBoost: () => void;
}

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

export const useTradeStore = create<TradeState>()(
    persist(
        (set) => ({
            trades: [],
            metrics: {
                latencyNs: 818,
                executionsSession: 0,
                avgExecutionNs: 794,
            },
            stats: {
                todayPnl: 0,
                weekPnl: 0,
                monthPnl: 0,
                winRate: 0,
                profitTrades: 0,
                totalTrades: 0,
                todayDate: todayStr(),
            },
            globalWinrate: 60,
            tradeDelayMs: 800,
            isTradingActive: true,
            boostEndTime: null,

            addTrade: (trade, shouldUpdateStats = false, pnlDelta = 0) => set((state) => {
                const newTrades = [trade, ...state.trades].slice(0, 50); // Keep last 50

                if (!shouldUpdateStats) {
                    return { trades: newTrades };
                }

                // Reset daily stats if it's a new day
                const today = todayStr();
                const isNewDay = state.stats.todayDate !== today;

                const prevTodayPnl = isNewDay ? 0 : state.stats.todayPnl;
                const newTotal = state.stats.totalTrades + 1;
                const newProfit = trade.type === 'profit' ? state.stats.profitTrades + 1 : state.stats.profitTrades;

                return {
                    trades: newTrades,
                    stats: {
                        todayPnl: prevTodayPnl + pnlDelta,
                        weekPnl: state.stats.weekPnl + pnlDelta,
                        monthPnl: state.stats.monthPnl + pnlDelta,
                        totalTrades: newTotal,
                        profitTrades: newProfit,
                        winRate: newTotal > 0 ? (newProfit / newTotal) * 100 : 0,
                        todayDate: today,
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
            toggleTrading: () => set((state) => ({ isTradingActive: !state.isTradingActive })),
            activateBoost: () => set({ boostEndTime: Date.now() + 3 * 3600 * 1000 }),
        }),
        {
            name: 'zyphex-trade-storage',
            partialize: (state) => ({
                // Persist stats but NOT trades or metrics (those are session-only)
                stats: state.stats,
                globalWinrate: state.globalWinrate,
                tradeDelayMs: state.tradeDelayMs,
                isTradingActive: state.isTradingActive,
                boostEndTime: state.boostEndTime,
            }),
        }
    )
);
