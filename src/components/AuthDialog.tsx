import { useState, type FormEvent } from 'react';
import { api, type User } from '../lib/api';
import { useSession } from '../lib/session';
import { Logo } from './Logo';

/** Sign-in dialog, shown only when a visitor tries something that needs an account */
export function AuthDialog() {
  const { setUser, refresh, loginPrompt, closeLogin } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!loginPrompt) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : form;
      const r = await api<{ user: User }>(`auth/${mode}`, { method: 'POST', body });
      await refresh();
      setUser(r.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function useDemo() {
    const d = await api<{ email: string; password: string }>('auth/demo').catch(() => null);
    if (d) {
      setMode('login');
      setForm({ name: '', email: d.email, password: d.password });
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(e) => e.target === e.currentTarget && closeLogin()}>
      <section className="modal__card panel auth-dialog">
        <button className="icon-btn modal__close" aria-label="Close" onClick={closeLogin}>×</button>
        <Logo size={36} />
        <h2 id="auth-title">{mode === 'login' ? 'Log in to continue' : 'Create your free account'}</h2>
        <p className="muted small">{loginPrompt.reason}</p>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>Log in</button>
          <button role="tab" aria-selected={mode === 'register'} onClick={() => { setMode('register'); setError(''); }}>Create account</button>
        </div>
        <form onSubmit={submit} className="form">
          {mode === 'register' && (
            <label className="field">Name<input required maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>
          )}
          <label className="field">Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></label>
          <label className="field">Password
            <input required type="password" minLength={mode === 'register' ? 8 : 1} value={form.password}
                   onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            {mode === 'register' && <span className="fineprint">At least 8 characters.</span>}
          </label>
          <button className="btn btn--primary btn--block" disabled={busy}>
            {busy ? 'One moment…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
          {error && <p className="error" role="alert">{error}</p>}
        </form>
        <div className="demo-box">
          <p><strong>Recruiter or just looking?</strong> Use the shared demo account.</p>
          <button className="btn btn--ghost btn--sm" onClick={() => void useDemo()}>Fill in demo account</button>
        </div>
      </section>
    </div>
  );
}
