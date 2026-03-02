import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Layout/Header';
import BottomNav from './components/Layout/BottomNav';
import PageContainer from './components/Layout/PageContainer';
import HomePage from './pages/HomePage';
import WalletPage from './pages/WalletPage';
import ReferralPage from './pages/ReferralPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';
import { useUserStore } from './store/userStore';

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col h-[100dvh] overflow-hidden bg-bg-main text-text-main">
    <Header />
    <PageContainer>
      {children}
    </PageContainer>
    <BottomNav />
    <footer className="text-center pt-2 pb-3 text-[11px] text-[#8B949E] shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      @ZYPHEXAUTOTRAIDINGBOT
    </footer>
  </div>
);

function App() {
  const { isAuthenticated } = useUserStore();

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={
          !isAuthenticated ? <AuthPage onLogin={() => { }} /> : <Navigate to="/" />
        } />

        <Route path="/" element={isAuthenticated ? <AppLayout><HomePage /></AppLayout> : <Navigate to="/auth" />} />
        <Route path="/wallet" element={isAuthenticated ? <AppLayout><WalletPage /></AppLayout> : <Navigate to="/auth" />} />
        <Route path="/referrals" element={isAuthenticated ? <AppLayout><ReferralPage /></AppLayout> : <Navigate to="/auth" />} />
        <Route path="/stats" element={isAuthenticated ? <AppLayout><StatsPage /></AppLayout> : <Navigate to="/auth" />} />
        <Route path="/settings" element={isAuthenticated ? <AppLayout><SettingsPage /></AppLayout> : <Navigate to="/auth" />} />
        <Route path="/admin" element={isAuthenticated ? <AppLayout><AdminPage /></AppLayout> : <Navigate to="/auth" />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
