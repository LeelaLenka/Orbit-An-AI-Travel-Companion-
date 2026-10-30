import { useState, type FormEvent } from 'react';
import { api, type User } from '../lib/api';
import { useSession } from '../lib/session';
import { Logo } from '../components/Logo';

/** Sign in or create an account. Everything in Orbit needs an account. */
export function AuthPage() {
  const { setUser, refresh } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : form;
      const r = await api<{ user: User }>(`auth/${mode}`, { method: 'POST', body });
      setUser(r.user);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
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
    <main className="auth">
      <div className="auth__sky" aria-hidden="true" />
      <section className="auth__intro">
        <Logo size={44} />
        <h1>The whole planet, <span className="grad">one search away.</span></h1>
        <p>Explore Earth on a 3D globe made from yesterday’s NASA satellite pictures. Check live weather anywhere, get an AI briefing on any town, and find destinations that fit your budget, in your own currency.</p>
        <ul className="auth__points">
          <li>Live weather and 7-day forecasts for any place</li>
          <li>AI destination scans: costs, laws, emergency numbers, food</li>
          <li>Budget planner with cheap, moderate and expensive picks</li>
        </ul>
      </section>

      <section className="auth__card panel" aria-labelledby="auth-title">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>Log in</button>
          <button role="tab" aria-selected={mode === 'register'} onClick={() => { setMode('register'); setError(''); }}>Create account</button>
        </div>
        <h2 id="auth-title" className="sr-only">{mode === 'login' ? 'Log in' : 'Create account'}</h2>
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
          <p><strong>Recruiter or just looking?</strong> Try the shared demo account.</p>
          <button className="btn btn--ghost btn--sm" onClick={() => void useDemo()}>Fill in demo account</button>
        </div>
      </section>
    </main>
  );
}
