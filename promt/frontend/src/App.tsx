import { useEffect, useCallback, useRef, useState, lazy, Suspense, Component, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Header from './components/Layout/Header';
import BottomNav from './components/Layout/BottomNav';
import PageContainer from './components/Layout/PageContainer';
import HomePage from './pages/HomePage';
import { CONFIG } from './config';
import { useUserStore } from './store/userStore';
import { useTradeStore, type Trade } from './store/tradeStore';
import { useWalletStore } from './store/walletStore';
import type { Network } from './store/walletStore';
import { MockAPI } from './api/mockServices';

const WalletPage = lazy(() => import('./pages/WalletPage').then(m => ({ default: m.default })));
const ExchangePage = lazy(() => import('./pages/ExchangePage').then(m => ({ default: m.default })));
const ReferralPage = lazy(() => import('./pages/ReferralPage').then(m => ({ default: m.default })));
const StatsPage = lazy(() => import('./pages/StatsPage').then(m => ({ default: m.default })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.default })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.default })));
import AuthPage from './pages/AuthPage';

const isInsideTelegram = () => typeof window !== 'undefined' && !!window.Telegram?.WebApp;

function AdminRouteWithBoundary() {
  const navigate = useNavigate();
  return (
    <AdminRouteErrorBoundary onGoHome={() => navigate('/')}>
      <AdminPage />
    </AdminRouteErrorBoundary>
  );
}

// ═══════════════════════════════════════════
// Trade engine — runs globally, not just on HomePage
// ═══════════════════════════════════════════

const LIVE_PAIRS = ['BONK', 'FIL', 'ETH', 'KAS', 'ROSE', 'SUI', 'VET', 'ALGO', 'LINK', 'APT', 'BNB', 'ATOM', 'AAVE', 'LTC', 'XRP', 'DOGE', 'SOL', 'ARB', 'OP'];
const uid = () => Math.random().toString(36).slice(2, 10);
const formatTime = () => new Date().toTimeString().slice(0, 8);

function randomTrade(winratePercent: number, userBalance: number, tradeDelayMs: number = 800, dailyTargetRatio: number = 0.03): Trade & { pnlUsdValue: number } {
  const pair = LIVE_PAIRS[Math.floor(Math.random() * LIVE_PAIRS.length)];
  const isProfit = Math.random() * 100 < winratePercent;
  const pnlAbs = Math.random() * 2 + 0.01;

  // Target daily %: 3% base + 0.02% per referral
  const msPerDay = 24 * 60 * 60 * 1000;
  const tradesPerDay = Math.max(1, msPerDay / Math.max(1, tradeDelayMs));
  const expectedValuePerTrade = (userBalance * dailyTargetRatio) / tradesPerDay;

  const pWin = winratePercent / 100;
  const pLoss = 1 - pWin;

  let winAmount = 0;
  let lossAmount = 0;

  // Base visual trade amount: 0.1–0.5% of user's balance
  const baseVisualAmount = Math.max(userBalance, 100) * (0.001 + Math.random() * 0.004);

  if (pWin === 1) {
    winAmount = expectedValuePerTrade;
  } else if (pWin === 0) {
    lossAmount = baseVisualAmount;
  } else {
    winAmount = baseVisualAmount;
    lossAmount = (pWin * winAmount - expectedValuePerTrade) / pLoss;

    if (lossAmount < 0) {
      lossAmount = 0;
      winAmount = expectedValuePerTrade / pWin;
    }
  }

  const pnlUsdValue = isProfit ? winAmount : -lossAmount;

  const pnlUsdAbs = Math.abs(pnlUsdValue);
  const pnl = isProfit ? `+${pnlAbs.toFixed(4)}` : `-${pnlAbs.toFixed(4)}`;
  const pnlUsd = isProfit ? `($${pnlUsdAbs.toFixed(4)})` : `($-${pnlUsdAbs.toFixed(4)})`;
  return {
    id: `live_${uid()}`,
    time: formatTime(),
    pair,
    pnl,
    pnlUsd,
    type: isProfit ? 'profit' : 'loss',
    pnlUsdValue,
  };
}

/** Runs the trade engine globally — generates trades and updates wallet balance */
function useTradeEngine() {
  const { addTrade, incrementExecutions, updateMetrics, globalWinrate, tradeDelayMs, isTradingActive, boostEndTime } = useTradeStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tradeCountRef = useRef(0);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const wallet = useWalletStore.getState();
      const totalUsd = wallet.totalUsd;
      const totalDeposited = wallet.totalDeposited || 0;

      const isBoostActive = boostEndTime && Date.now() < boostEndTime;
      const dailyPercent = isBoostActive ? 10 : wallet.expectedDailyPercent;
      const dailyTargetRatio = typeof dailyPercent === 'number' ? dailyPercent / 100 : 0.03;

      if (!isTradingActive) return;

      if (totalDeposited <= 0 && totalUsd <= 0) {
        const trade = randomTrade(globalWinrate, 0, tradeDelayMs, dailyTargetRatio);
        addTrade(trade, true, 0);
        incrementExecutions();
      } else {
        const baseAmount = totalDeposited > 0 ? totalDeposited : totalUsd;
        const trade = randomTrade(globalWinrate, baseAmount, tradeDelayMs, dailyTargetRatio);
        addTrade(trade, true, trade.pnlUsdValue);
        incrementExecutions();

        const walletState = useWalletStore.getState();
        const newTotal = Math.max(0, walletState.totalUsd + trade.pnlUsdValue);
        const ratio = walletState.totalUsd > 0 ? newTotal / walletState.totalUsd : 1;
        const newBalances = { ...walletState.balances };
        for (const net of Object.keys(newBalances) as Array<Network>) {
          newBalances[net] = Math.max(0, newBalances[net] * ratio);
        }
        walletState.setBalances(newTotal, newBalances);
      }

      // Sync balance to server every 10 trades
      tradeCountRef.current++;
      if (tradeCountRef.current % 10 === 0) {
        MockAPI.syncBalanceToServer();
      }

      const baseLatency = 780 + Math.floor(Math.random() * 60);
      updateMetrics({
        latencyNs: baseLatency,
        avgExecutionNs: baseLatency + Math.floor(Math.random() * 30),
      });
    }, tradeDelayMs || 800);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Sync balance on cleanup (page close / unmount)
      MockAPI.syncBalanceToServer();
    };
  }, [addTrade, incrementExecutions, updateMetrics, globalWinrate, tradeDelayMs, isTradingActive, boostEndTime]);
}

// ═══════════════════════════════════════════
// App layout
// ═══════════════════════════════════════════

/** Fallback при загрузке lazy-роутов; через 12 сек предлагаем обновить страницу */
function PageFallback() {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 12000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center min-h-[50dvh] px-6 text-center">
      <div className="animate-pulse text-[#94A3B8] mb-4">Загрузка…</div>
      {timedOut && (
        <div className="text-sm text-[#FBBF24] mb-3">
          Долгая загрузка. Проверьте интернет.
        </div>
      )}
      {timedOut && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-[#00E676] text-black font-semibold"
        >
          Обновить страницу
        </button>
      )}
    </div>
  );
}

/** Ловит ошибки (в т.ч. сбой загрузки чанков) и показывает кнопку «Обновить» */
class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    try { window.Telegram?.WebApp?.ready(); } catch { /* ignore */ }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center bg-[#0B0F19] text-[#F8FAFC]">
          <p className="text-[#94A3B8] mb-4">Не удалось загрузить приложение.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-[#00E676] text-black font-semibold"
          >
            Обновить страницу
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Fallback при сбое загрузки только админ-панели (чанк 404 и т.д.) — не роняем всё приложение */
function AdminRouteErrorFallback({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center text-[#F8FAFC]">
      <p className="text-[#94A3B8] mb-4">Не удалось загрузить админ-панель.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-[#00E676] text-black font-semibold"
        >
          Обновить
        </button>
        <button
          type="button"
          onClick={onGoHome}
          className="px-5 py-2.5 rounded-xl surface-raised text-[#F8FAFC] font-semibold"
        >
          На главную
        </button>
      </div>
    </div>
  );
}

class AdminRouteErrorBoundary extends Component<{ children: ReactNode; onGoHome: () => void }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <AdminRouteErrorFallback onGoHome={this.props.onGoHome} />;
    }
    return this.props.children;
  }
}

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div
    className="flex flex-col overflow-hidden bg-bg-main text-text-main"
    style={{
      background: 'linear-gradient(180deg, #0B0F19 0%, #060A13 100%)',
      minHeight: '100dvh',
      height: '100dvh',
      paddingTop: 'env(safe-area-inset-top, 0)',
    }}
  >
    <Header />
    <PageContainer>
      {children}
    </PageContainer>
    <BottomNav />
    {!isInsideTelegram() && (
      <footer className="text-center pt-2 pb-3 text-[11px] text-[#8B949E] shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {'@' + CONFIG.BOT_USERNAME}
      </footer>
    )}
  </div>
);

const START_PARAM_REGEX = /^[\w-]{1,512}$/;

function App() {
  const { isAuthenticated } = useUserStore();
  const [apiUnavailable, setApiUnavailable] = useState<boolean | null>(null);

  // Скрыть спиннер Telegram только после того, как наше приложение смонтировалось и отрисовалось
  useEffect(() => {
    try { window.Telegram?.WebApp?.ready(); } catch { /* ignore */ }
  }, []);

  // Проверка доступности API: если через 8 сек нет ответа — показываем «Сервер недоступен»
  useEffect(() => {
    const base = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';
    const url = `${base}/api/health`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    fetch(url, { signal: controller.signal })
      .then((r) => { clearTimeout(t); if (!r.ok) setApiUnavailable(true); })
      .catch(() => { clearTimeout(t); setApiUnavailable(true); });
    return () => { clearTimeout(t); controller.abort(); };
  }, []);

  // Fallback: read Telegram start_param (ref link) when app is ready — in case it wasn't available at bootstrap
  useEffect(() => {
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (typeof startParam === 'string' && START_PARAM_REGEX.test(startParam)) {
      const code = startParam.trim().toUpperCase();
      useUserStore.getState().setReferredBy(code);
      try { sessionStorage.setItem('wevox_ref', code); } catch { /* ignore */ }
    }
  }, []);

  // Run trade engine globally (works on ANY page, not just HomePage)
  useTradeEngine();

  // Validate session
  const validateSession = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const exists = await MockAPI.checkRegistered();
      if (!exists) {
        console.warn('[WEVOX] Session invalid — user not in DB, logging out');
        useUserStore.getState().logout();
      }
    } catch {
      // Network error — do nothing
    }
  }, [isAuthenticated]);

  useEffect(() => {
    MockAPI.syncVisitor().catch(() => { });
    validateSession();
    if (isAuthenticated) {
      MockAPI.fetchBalance();
    }
  }, [validateSession, isAuthenticated]);

  if (apiUnavailable === true) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(180deg, #0B0F19 0%, #060A13 100%)', color: '#F8FAFC', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <p style={{ marginBottom: 8, color: '#94A3B8' }}>Сервер недоступен</p>
        <p style={{ marginBottom: 20, fontSize: 14, color: '#64748B' }}>Проверьте интернет или попробуйте позже</p>
        <button type="button" onClick={() => window.location.reload()} style={{ padding: '12px 24px', background: '#00E676', color: '#000', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>Обновить</button>
      </div>
    );
  }

  return (
    <AppErrorBoundary>
      <Router basename="/miniapp">
        <Suspense fallback={<PageFallback />}>
          <Routes>
          <Route path="/auth" element={
            !isAuthenticated ? <AuthPage onLogin={() => { }} /> : <Navigate to="/" />
          } />

          <Route path="/" element={isAuthenticated ? <AppLayout><HomePage /></AppLayout> : <Navigate to="/auth" />} />
          <Route path="/wallet" element={isAuthenticated ? <AppLayout><WalletPage /></AppLayout> : <Navigate to="/auth" />} />
          <Route path="/exchange" element={isAuthenticated ? <AppLayout><ExchangePage /></AppLayout> : <Navigate to="/auth" />} />
          <Route path="/referrals" element={isAuthenticated ? <AppLayout><ReferralPage /></AppLayout> : <Navigate to="/auth" />} />
          <Route path="/stats" element={isAuthenticated ? <AppLayout><StatsPage /></AppLayout> : <Navigate to="/auth" />} />
          <Route path="/settings" element={isAuthenticated ? <AppLayout><SettingsPage /></AppLayout> : <Navigate to="/auth" />} />
          <Route path="/admin" element={isAuthenticated ? <AppLayout><AdminRouteWithBoundary /></AppLayout> : <Navigate to="/auth" />} />

          <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </Router>
    </AppErrorBoundary>
  );
}

export default App;
