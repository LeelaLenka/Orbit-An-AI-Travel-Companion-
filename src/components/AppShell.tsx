import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../lib/api';
import { CURRENCIES, useSession } from '../lib/session';
import { Logo } from './Logo';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, setUser, setCurrency } = useSession();
  if (!user) return null;
  const currencies = CURRENCIES.includes(user.currency) ? CURRENCIES : [user.currency, ...CURRENCIES];

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="topbar__brand" aria-label="Orbit home"><Logo /></NavLink>
        <nav className="topbar__nav" aria-label="Main">
          <NavLink to="/" end>Explore</NavLink>
          <NavLink to="/budget">Budget planner</NavLink>
          <NavLink to="/saved">Saved</NavLink>
        </nav>
        <div className="topbar__right">
          <label className="currency">
            <span className="sr-only">Currency</span>
            <select value={user.currency} onChange={(e) => setCurrency(e.target.value)}>
              {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <span className="avatar" title={user.email} aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
          <button className="btn btn--ghost btn--sm" onClick={() => void api('auth/logout', { method: 'POST' }).finally(() => setUser(null))}>
            Log out
          </button>
        </div>
      </header>
      {user.demo && <p className="demo-note">You’re using the shared demo account. Create your own to keep your saved places private.</p>}
      {children}
    </div>
  );
}
