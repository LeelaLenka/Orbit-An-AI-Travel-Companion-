import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { AuthDialog } from './AuthDialog';
import { Bine } from './Bine';
import { Logo } from './Logo';
import { TripComplete } from './TripComplete';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, setUser, requireLogin } = useSession();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMenu(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [menu]);

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
          <Link to="/settings" className="icon-btn icon-btn--nav" aria-label="Settings" title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
          </Link>
          {user ? (
            <div className="account" ref={menuRef}>
              <button className="account__btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
                <span className="avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
                <span className="account__name">{user.name.split(' ')[0]}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" /></svg>
              </button>
              {menu && (
                <div className="account__menu panel" role="menu">
                  <p className="account__who"><strong>{user.name}</strong><span className="muted small">{user.email}</span></p>
                  <Link role="menuitem" to="/settings#account">Account settings</Link>
                  <Link role="menuitem" to="/trips">My trips</Link>
                  <Link role="menuitem" to="/settings">Settings</Link>
                  <button role="menuitem" onClick={() => void api('auth/logout', { method: 'POST' }).finally(() => { setUser(null); setMenu(false); })}>Log out</button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn--primary btn--sm" onClick={() => requireLogin('Save places, plan trips, track your savings and talk to Bine.')}>Log in</button>
          )}
        </div>
      </header>
      {user?.demo && <p className="demo-note">You’re using the shared demo account. Create your own to keep your trips and settings private.</p>}
      {children}
      <Bine />
      <AuthDialog />
      <TripComplete />
    </div>
  );
}
