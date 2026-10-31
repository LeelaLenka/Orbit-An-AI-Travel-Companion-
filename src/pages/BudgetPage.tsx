import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, type BudgetPlan, type Usage } from '../lib/api';
import { useSession } from '../lib/session';

const TIER_INFO = {
  cheap: { title: 'Cheap', note: 'Comfortably under budget' },
  moderate: { title: 'Moderate', note: 'Close to your budget' },
  expensive: { title: 'Expensive', note: 'A stretch' },
} as const;

/** Tell Orbit your budget in any currency; it suggests destinations in three price tiers */
export function BudgetPage() {
  const { money, toUSD, setUsage, usage, currency, requireLogin } = useSession();
  const [form, setForm] = useState({ amount: '', from: '', days: '5', travellers: '1', interests: '', month: '' });
  const [plan, setPlan] = useState<BudgetPlan | null>(null);
  const [meta, setMeta] = useState({ cached: false, sample: false, usd: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!requireLogin('The budget planner is free with an account.', () => void submit())) return;
    const amount = Number(form.amount.replace(/,/g, ''));
    if (!(amount > 0)) return setError('Enter your total budget.');
    const usd = toUSD(amount, currency);
    if (!usd) return setError('Exchange rates are still loading. Try again in a moment.');
    setBusy(true);
    setError('');
    try {
      const r = await api<{ plan: BudgetPlan; cached: boolean; sample: boolean; usage: Usage }>('ai/budget', {
        method: 'POST',
        body: { amount, currency, amountUSD: usd, from: form.from, days: Number(form.days), travellers: Number(form.travellers), interests: form.interests, month: form.month },
      });
      setPlan(r.plan);
      setMeta({ cached: r.cached, sample: r.sample, usd });
      setUsage(r.usage);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <main className="page">
      <header className="page__head">
        <p className="eyebrow">Budget planner</p>
        <h1>Where can my budget take me?</h1>
        <p className="muted">Enter your total budget in {currency}. Orbit suggests destinations at three price levels, with costs converted at today’s exchange rate.</p>
      </header>

      <form className="panel budget-form" onSubmit={submit}>
        <label className="field">Total budget ({currency})<input required inputMode="decimal" value={form.amount} onChange={set('amount')} placeholder="e.g. 80000" /></label>
        <label className="field">Travelling from<input required maxLength={80} value={form.from} onChange={set('from')} placeholder="e.g. Hyderabad" /></label>
        <label className="field">Days<input required type="number" min={1} max={60} value={form.days} onChange={set('days')} /></label>
        <label className="field">Travellers<input required type="number" min={1} max={12} value={form.travellers} onChange={set('travellers')} /></label>
        <label className="field"><span>Interests <span className="muted">(optional)</span></span><input maxLength={120} value={form.interests} onChange={set('interests')} placeholder="beaches, food, hiking…" /></label>
        <label className="field"><span>Month <span className="muted">(optional)</span></span><input maxLength={20} value={form.month} onChange={set('month')} placeholder="e.g. December" /></label>
        <div className="budget-form__go">
          <button className="btn btn--primary" disabled={busy}>{busy ? 'Planning…' : 'Find destinations'}</button>
          {usage?.aiEnabled && <span className="fineprint">{usage.remaining} AI requests left today</span>}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </form>

      {plan && (
        <section className="results" aria-label="Suggestions">
          <div className="tags">
            <span className="tag tag--ai">AI suggestions</span>
            {meta.cached && <span className="tag">Saved answer</span>}
            {meta.sample && <span className="tag tag--warn">Sample data</span>}
            <span className="fineprint">Your budget ≈ {money(meta.usd)} total</span>
          </div>
          <div className="tier-grid">
            {plan.tiers.map((t) => (
              <div key={t.tier} className={`tier tier--${t.tier}`}>
                <h2>{TIER_INFO[t.tier].title}</h2>
                <p className="muted small">{TIER_INFO[t.tier].note}</p>
                {t.destinations.map((d) => {
                  const fits = d.estimatedTotalUSD <= meta.usd;
                  return (
                    <article key={d.name + d.country} className="dest panel">
                      <h3>{d.name}<span className="muted">, {d.country}</span></h3>
                      <p className="dest__price"><strong>{money(d.estimatedTotalUSD)}</strong> total · {money(d.perDayUSD)}/day</p>
                      <span className={`tag ${fits ? 'tag--ok' : 'tag--warn'}`}>{fits ? 'Fits your budget' : 'Over budget'}</span>
                      <p className="small">{d.why}</p>
                      <p className="fineprint">Best for: {d.bestFor}</p>
                      <Link className="btn btn--ghost btn--sm"
                        to={`/?${new URLSearchParams({ name: d.name, country: d.country, lat: String(d.lat), lon: String(d.lon), tab: 'scan' })}`}>
                        View on globe
                      </Link>
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="fineprint">Totals are AI estimates including travel from {form.from}, not live prices. Check fares and stays before booking.</p>
        </section>
      )}
    </main>
  );
}
