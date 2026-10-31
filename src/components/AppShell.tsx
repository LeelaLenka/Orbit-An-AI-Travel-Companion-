import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../lib/api';
import { CURRENCIES, useSession } from '../lib/session';
import { Logo } from './Logo';
import { AuthDialog } from './AuthDialog';
import { Bine } from './Bine';
import { TripComplete } from './TripComplete';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, setUser, setCurrency, currency, requireLogin } = useSession();
  const currencies = CURRENCIES.includes(currency) ? CURRENCIES : [currency, ...CURRENCIES];

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="topbar__brand" aria-label="Orbit home"><Logo /></NavLink>
        <nav className="topbar__nav" aria-label="Main">
          <NavLink to="/" end>Explore</NavLink>
          <NavLink to="/plan">Plan a trip</NavLink>
          <NavLink to="/budget">Budget</NavLink>
          <NavLink to="/trips">My trips</NavLink>
        </nav>
        <div className="topbar__right">
          <label className="currency">
            <span className="sr-only">Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          {user ? (<>
            <span className="avatar" title={user.email} aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
            <button className="btn btn--ghost btn--sm" onClick={() => void api('auth/logout', { method: 'POST' }).finally(() => setUser(null))}>Log out</button>
          </>) : (
            <button className="btn btn--primary btn--sm" onClick={() => requireLogin('Save places, plan trips, track your savings and talk to Bine.')}>Log in</button>
          )}
        </div>
      </header>
      {user?.demo && <p className="demo-note">You’re using the shared demo account. Create your own to keep your saved places private.</p>}
      {children}
      <Bine />
      <AuthDialog />
      <TripComplete />
    </div>
  );
}
