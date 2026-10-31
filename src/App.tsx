import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Logo } from './components/Logo';
import { SessionProvider, useSession } from './lib/session';
import { BudgetPage } from './pages/BudgetPage';
import { ExplorePage } from './pages/ExplorePage';
import { PlanPage } from './pages/PlanPage';
import { TripsPage } from './pages/TripsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PrefsProvider } from './lib/prefs';
import { ErrorBoundary } from './components/ErrorBoundary';

function Gate() {
  const { loading } = useSession();
  if (loading) return <div className="splash"><Logo size={56} /></div>;
  // Anyone can explore; saving, planning, budgets and Bine ask for an account when used
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<ExplorePage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/saved" element={<Navigate to="/trips" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <PrefsProvider>
        <SessionProvider>
          <BrowserRouter>
            <Gate />
          </BrowserRouter>
        </SessionProvider>
      </PrefsProvider>
    </ErrorBoundary>
  );
}
