import { useEffect, useState, type FormEvent } from 'react';
import { api, type SavedPlan } from '../lib/api';
import { useSession } from '../lib/session';

/** When a trip's end date has passed, asks what was spent and shows the savings */
export function TripComplete() {
  const { user, money, fromUSD, toUSD, currency } = useSession();
  const [due, setDue] = useState<SavedPlan | null>(null);
  const [spent, setSpent] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    api<{ plans: SavedPlan[] }>('plans').then((r) => {
      const next = r.plans.find((p) => p.status === 'upcoming' && p.endDate < today && !dismissed.includes(p._id)) ?? null;
      setDue(next);
      if (next) setSpent(String(Math.round(fromUSD(next.plannedTotalUSD))));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dismissed]);

  if (!due) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const usd = toUSD(Number(spent.replace(/,/g, '')) || 0);
    if (usd === null) return setError('Exchange rates are still loading; try again in a moment.');
    setBusy(true);
    try {
      const r = await api<{ savedUSD: number }>(`plans/${due!._id}/complete`, { method: 'POST', body: { actualSpentUSD: usd } });
      setResult(r.savedUSD);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const close = () => { setDismissed([...dismissed, due._id]); setResult(null); };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="done-title">
      <section className="modal__card panel trip-done">
        {result === null ? (
          <>
            <div className="trip-done__art" aria-hidden="true">✈</div>
            <h2 id="done-title">Welcome back! Your trip to {due.destination.name} is complete.</h2>
            <p className="muted">It ended on {due.endDate}. How much did you spend in total? We’ll compare it with what a typical trip costs.</p>
            <form onSubmit={submit} className="form">
              <label className="field">Total spent ({currency})<input inputMode="decimal" required value={spent} onChange={(e) => setSpent(e.target.value)} /></label>
              <div className="row">
                <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Complete trip'}</button>
                <button type="button" className="btn btn--ghost" onClick={close}>Later</button>
              </div>
              {error && <p className="error">{error}</p>}
            </form>
          </>
        ) : (
          <>
            <div className="trip-done__art trip-done__art--win" aria-hidden="true">{result >= 0 ? '🎉' : '🧾'}</div>
            <h2 id="done-title">{result >= 0 ? `You saved ${money(result)}` : `You spent ${money(-result)} more than typical`}</h2>
            <p className="muted">{result >= 0
              ? `A typical trip to ${due.destination.name} costs about ${money(due.typicalTotalUSD)}. Planning with Orbit kept you under it.`
              : 'That happens. Your next plan will use what you learned. Your trip is saved in Past trips.'}</p>
            <button className="btn btn--primary" onClick={close}>Done</button>
          </>
        )}
      </section>
    </div>
  );
}
