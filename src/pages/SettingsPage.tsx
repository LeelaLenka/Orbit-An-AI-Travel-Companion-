import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { LANGS } from '../lib/languages';
import { usePrefs, type Prefs } from '../lib/prefs';
import { useSession } from '../lib/session';
import { CurrencySelect } from '../components/CurrencySelect';

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => <button key={o.v} role="radio" aria-checked={value === o.v} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>{o.label}</button>)}
    </div>
  );
}

function Row({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="setting">
      <div><p className="setting__title">{title}</p>{help && <p className="fineprint">{help}</p>}</div>
      <div className="setting__control">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const { prefs, setPref, reset } = usePrefs();
  const { user, usage, refresh, setUser, requireLogin } = useSession();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.hash === '#account') setTimeout(() => document.getElementById('account')?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [location.hash]);

  const set = <K extends keyof Prefs>(k: K) => (v: Prefs[K]) => setPref(k, v);

  return (
    <main className="page page--narrow">
      <header className="page__head">
        <p className="eyebrow">Settings</p>
        <h1>Make Orbit yours</h1>
        <p className="muted">These settings are saved in this browser. Your currency and account details are saved to your account when you’re logged in.</p>
      </header>

      <section className="panel settings">
        <h2>Appearance</h2>
        <Row title="Theme" help="System follows your device’s light or dark setting.">
          <Seg label="Theme" value={prefs.theme} onChange={set('theme')} options={[{ v: 'system', label: 'System' }, { v: 'dark', label: 'Dark' }, { v: 'light', label: 'Light' }]} />
        </Row>
        <Row title="Reduce motion" help="Turns off animations and the globe’s slow spin.">
          <Toggle checked={prefs.reduceMotion} onChange={set('reduceMotion')} label="Reduce motion" />
        </Row>
      </section>

      <section className="panel settings">
        <h2>Units and money</h2>
        <Row title="Currency" help="Used for every cost, budget and trip total."><CurrencySelect label="" /></Row>
        <Row title="Temperature">
          <Seg label="Temperature" value={prefs.temperature} onChange={set('temperature')} options={[{ v: 'C', label: '°C' }, { v: 'F', label: '°F' }]} />
        </Row>
        <Row title="Distance">
          <Seg label="Distance" value={prefs.distance} onChange={set('distance')} options={[{ v: 'km', label: 'Kilometres' }, { v: 'mi', label: 'Miles' }]} />
        </Row>
      </section>

      <section className="panel settings">
        <h2>Map</h2>
        <Row title="Street map style" help="What the street map shows first. You can switch any time on the map.">
          <Seg label="Map style" value={prefs.mapStyle} onChange={set('mapStyle')} options={[{ v: 'map', label: 'Map' }, { v: 'satellite', label: 'Satellite' }]} />
        </Row>
      </section>

      <section className="panel settings">
        <h2>Bine, the assistant</h2>
        <Row title="Read answers aloud"><Toggle checked={prefs.bineVoice} onChange={set('bineVoice')} label="Read answers aloud" /></Row>
        <Row title="Language" help="The language Bine listens for. It replies in whatever language you write or speak.">
          <select value={prefs.bineLang} onChange={(e) => setPref('bineLang', e.target.value)} aria-label="Bine language">
            <option value="">Same as my browser</option>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </Row>
      </section>

      <section id="account" className="panel settings">
        <h2>Account</h2>
        {user ? (
          <AccountSection onDeleted={() => { setUser(null); navigate('/'); }} refresh={refresh} demo={user.demo} name={user.name} email={user.email} usage={usage} />
        ) : (
          <div className="setting">
            <p className="muted">Log in to change your name, password and default currency, or to delete your account.</p>
            <button className="btn btn--primary btn--sm" onClick={() => requireLogin('Log in to manage your account.')}>Log in</button>
          </div>
        )}
      </section>

      <button className="btn btn--ghost btn--sm reset" onClick={() => { if (confirm('Reset theme, units, map and Bine settings to their defaults?')) reset(); }}>Reset settings in this browser</button>
    </main>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'switch--on' : ''}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

function AccountSection({ name, email, demo, usage, refresh, onDeleted }: {
  name: string; email: string; demo: boolean; usage: { used: number; limit: number; remaining: number } | null;
  refresh: () => Promise<void>; onDeleted: () => void;
}) {
  const [newName, setNewName] = useState(name);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [del, setDel] = useState('');
  const [msg, setMsg] = useState<{ where: string; text: string; ok: boolean } | null>(null);

  const run = (where: string, fn: () => Promise<unknown>, okText: string) => async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await fn();
      setMsg({ where, text: okText, ok: true });
    } catch (err) {
      setMsg({ where, text: (err as Error).message, ok: false });
    }
  };
  const note = (where: string) => msg?.where === where && <p className={msg.ok ? 'ok small' : 'error small'} role="status">{msg.text}</p>;

  return (
    <>
      {demo && <p className="notice-warn small">This is the shared demo account, so its name, password and deletion are locked. Create your own account to use these.</p>}
      <form className="setting setting--stack" onSubmit={run('name', async () => { await api('me/profile', { method: 'PUT', body: { name: newName } }); await refresh(); }, 'Name saved.')}>
        <label className="field">Name<input value={newName} maxLength={60} required onChange={(e) => setNewName(e.target.value)} disabled={demo} /></label>
        <label className="field">Email<input value={email} disabled /></label>
        <button className="btn btn--ghost btn--sm" disabled={demo || newName.trim() === name}>Save name</button>
        {note('name')}
      </form>

      {usage && (
        <div className="setting">
          <div><p className="setting__title">AI requests today</p><p className="fineprint">Scans, plans, budgets and Bine share this daily allowance. It resets at midnight UTC.</p></div>
          <div className="usage"><span className="usage__bar"><span style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }} /></span><span className="small">{usage.used} / {usage.limit}</span></div>
        </div>
      )}

      <form className="setting setting--stack" onSubmit={run('pw', () => api('me/password', { method: 'PUT', body: pw }).then(() => setPw({ current: '', next: '' })), 'Password changed.')}>
        <p className="setting__title">Change password</p>
        <label className="field">Current password<input type="password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" disabled={demo} /></label>
        <label className="field">New password<input type="password" required minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" disabled={demo} /></label>
        <button className="btn btn--ghost btn--sm" disabled={demo}>Change password</button>
        {note('pw')}
      </form>

      <form className="setting setting--stack danger" onSubmit={(e) => {
        if (!confirm('Delete your account, trips and saved places permanently? This can’t be undone.')) { e.preventDefault(); return; }
        void run('del', () => api('me', { method: 'DELETE', body: { password: del } }).then(onDeleted), 'Account deleted.')(e);
      }}>
        <p className="setting__title">Delete account</p>
        <p className="fineprint">Permanently removes your account, your trips and your saved places.</p>
        <label className="field">Type your password to confirm<input type="password" required value={del} onChange={(e) => setDel(e.target.value)} autoComplete="current-password" disabled={demo} /></label>
        <button className="btn btn--danger btn--sm" disabled={demo}>Delete my account</button>
        {note('del')}
      </form>
    </>
  );
}
