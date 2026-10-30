import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Logo } from './components/Logo';
import { SessionProvider, useSession } from './lib/session';
import { AuthPage } from './pages/AuthPage';
import { BudgetPage } from './pages/BudgetPage';
import { ExplorePage } from './pages/ExplorePage';
import { SavedPage } from './pages/SavedPage';

function Gate() {
  const { user, loading } = useSession();
  if (loading) return <div className="splash"><Logo size={56} /></div>;
  if (!user) return <AuthPage />; // login required for everything
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<ExplorePage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </SessionProvider>
  );
}
