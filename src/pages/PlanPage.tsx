import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, planTotal, PURPOSES, type Hotel, type PlanInput, type Purpose, type RouteInfo, type TripPlan, type Usage } from '../lib/api';
import { useSession } from '../lib/session';
import { duration } from '../components/GettingThere';
import { LocateIcon, ModeIcon, PinIcon, PurposeIcon } from '../components/Icons';
import { PlaceSearch } from '../components/PlaceSearch';

type Spot = { name: string; country?: string; countryCode?: string; lat: number; lon: number };
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Plan a whole trip: pick a purpose, destination, dates and budget; Orbit plans travel, stay, food and days */
export function PlanPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { requireLogin, locate, money, toUSD, currency, setUsage, usage } = useSession();
  const [purpose, setPurpose] = useState<Purpose>('Vacation');
  const [dest, setDest] = useState<Spot | null>(null);
  const [origin, setOrigin] = useState<Spot | null>(null);
  const [form, setForm] = useState(() => {
    const start = new Date(Date.now() + 14 * 86_400_000);
    return { start: iso(start), end: iso(new Date(start.getTime() + 2 * 86_400_000)), travellers: '2', budget: '', notes: '' };
  });
  const [draft, setDraft] = useState<{ plan: TripPlan; route: RouteInfo; hotels: Hotel[]; sample: boolean; input: PlanInput } | null>(null);
  const [busy, setBusy] = useState<'plan' | 'save' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const lat = Number(params.get('lat')), lon = Number(params.get('lon')), name = params.get('name');
    if (name && Number.isFinite(lat) && Number.isFinite(lon)) setDest({ name, lat, lon, country: params.get('country') ?? '', countryCode: params.get('cc') ?? '' });
    try {
      const f = params.get('from');
      if (f) setOrigin(JSON.parse(f) as Spot);
    } catch { /* ignore a malformed link */ }
  }, [params]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function makePlan(e?: FormEvent) {
    e?.preventDefault();
    if (!dest || !origin) return setError('Choose where you’re going and where you’re starting from.');
    if (form.end < form.start) return setError('The return date is before the start date.');
    if (!requireLogin('Trip planning is free with an account, and your plans are saved there.', () => void makePlan())) return;
    const budget = Number(form.budget.replace(/,/g, '')) || 0;
    const input: PlanInput = {
      purpose, destination: { name: dest.name, country: dest.country ?? '', countryCode: dest.countryCode ?? '', lat: dest.lat, lon: dest.lon },
      origin: { name: origin.name, lat: origin.lat, lon: origin.lon }, startDate: form.start, endDate: form.end,
      travellers: Number(form.travellers) || 1, budgetUSD: budget ? (toUSD(budget) ?? 0) : 0, notes: form.notes,
    };
    setBusy('plan');
    setError('');
    setDraft(null);
    try {
      const r = await api<{ plan: TripPlan; route: RouteInfo; hotels: Hotel[]; sample: boolean; usage: Usage }>('plans/draft', { method: 'POST', body: input });
      setDraft({ ...r, input });
      setUsage(r.usage);
      setTimeout(() => document.getElementById('plan-result')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function accept() {
    if (!draft) return;
    setBusy('save');
    try {
      await api('plans', { method: 'POST', body: { input: draft.input, plan: draft.plan, plannedTotalUSD: planTotal(draft.plan), typicalTotalUSD: draft.plan.typicalTotalUSD, currency } });
      navigate('/trips?saved=1');
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  const p = draft?.plan;
  const total = p ? planTotal(p) : 0;
  return (
    <main className="page plan-page">
      <header className="page__head">
        <p className="eyebrow">Plan a trip</p>
        <h1>Tell us the trip. <span className="grad">We’ll plan the rest.</span></h1>
        <p className="muted">Travel there and back, real places to stay, food, a day-by-day plan and a budget. Accept it, and Orbit tracks it until you’re home.</p>
      </header>

      <form className="panel plan-form" onSubmit={makePlan}>
        <fieldset className="purposes">
          <legend className="field">What kind of trip?</legend>
          {PURPOSES.map((x) => (
            <button type="button" key={x} className={`purpose ${purpose === x ? 'purpose--on' : ''}`} aria-pressed={purpose === x} onClick={() => setPurpose(x)}>
              <PurposeIcon purpose={x} size={22} /> {x}
            </button>
          ))}
        </fieldset>

        <div className="plan-form__grid">
          <div className="field">
            <span>Going to</span>
            {dest ? <p className="chosen"><PinIcon size={16} /> {dest.name}{dest.country ? `, ${dest.country}` : ''} <button type="button" className="linkish" onClick={() => setDest(null)}>Change</button></p>
              : <PlaceSearch placeholder="Destination: city, temple, beach…" onPick={(x) => setDest(x)} />}
          </div>
          <div className="field">
            <span>Starting from</span>
            {origin ? <p className="chosen"><PinIcon size={16} /> {origin.name} <button type="button" className="linkish" onClick={() => setOrigin(null)}>Change</button></p>
              : <div className="origin-pick">
                  <PlaceSearch placeholder="Your city or address" onPick={(x) => setOrigin(x)} />
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => locate().then((l) => setOrigin({ name: 'My location', ...l })).catch((e: Error) => setError(e.message))}>
                    <LocateIcon size={16} /> Use my location
                  </button>
                </div>}
          </div>
          <label className="field">Leaving<input type="date" required value={form.start} min={iso(new Date())} onChange={set('start')} /></label>
          <label className="field">Returning<input type="date" required value={form.end} min={form.start} onChange={set('end')} /></label>
          <label className="field">Travellers<input type="number" min={1} max={12} required value={form.travellers} onChange={set('travellers')} /></label>
          <label className="field"><span>Budget ({currency}) <span className="muted">(optional)</span></span><input inputMode="decimal" value={form.budget} onChange={set('budget')} placeholder="e.g. 40000" /></label>
          <label className="field plan-form__wide"><span>Anything else? <span className="muted">(optional)</span></span><input maxLength={200} value={form.notes} onChange={set('notes')} placeholder="e.g. vegetarian food, travelling with grandparents, prefer trains" /></label>
        </div>
        <div className="row">
          <button className="btn btn--primary" disabled={busy !== null}>{busy === 'plan' ? 'Planning your trip… (10–20 s)' : 'Plan my trip'}</button>
          {usage?.aiEnabled && <span className="fineprint">{usage.remaining} AI requests left today</span>}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </form>

      {draft && p && (
        <section id="plan-result" className="plan-result">
          <div className="plan-hero panel">
            <div>
              <p className="eyebrow"><PurposeIcon purpose={draft.input.purpose} size={14} /> {draft.input.purpose} trip · {draft.input.startDate} → {draft.input.endDate}</p>
              <h2>{draft.input.origin.name} → {draft.input.destination.name}</h2>
              <p className="muted">{p.summary}</p>
              <div className="tags">
                <span className="tag tag--ai">AI plan</span>
                {draft.sample && <span className="tag tag--warn">Sample data</span>}
                <span className="tag">{draft.route.straightKm.toLocaleString()} km away</span>
              </div>
            </div>
            <div className="plan-total">
              <span className="muted small">Planned total</span>
              <strong>{money(total)}</strong>
              <span className="small">vs typical <s>{money(p.typicalTotalUSD)}</s></span>
              {p.typicalTotalUSD > total && <span className="tag tag--ok">Save about {money(p.typicalTotalUSD - total)}</span>}
            </div>
          </div>

          <div className="plan-grid">
            <article className="panel plan-card">
              <h3>Getting there and back</h3>
              {[['There', p.getThere], ['Back', p.getBack]].map(([label, leg]) => {
                const l = leg as TripPlan['getThere'];
                return (
                  <div key={label as string} className="leg">
                    <span className="leg__label">{label as string}</span>
                    <p><strong>{l.mode}</strong> · {l.duration} · {money(l.costUSD)}</p>
                    <p className="small muted">{l.route}</p>
                    <p className="small">{l.tip}</p>
                  </div>
                );
              })}
              <ul className="mini-modes">
                {draft.route.modes.filter((m) => m.available).map((m) => (
                  <li key={m.mode}><ModeIcon mode={m.mode} size={16} /> {duration(m.minutes)}</li>
                ))}
              </ul>
            </article>

            <article className="panel plan-card">
              <h3>Where to stay</h3>
              <p className="small muted">{p.stay.area} · about {money(p.stay.perNightUSD)} per night</p>
              <ul className="list">{p.stay.picks.map((h) => <li key={h.name}><strong>{h.name}</strong>: {h.why}</li>)}</ul>
              {draft.hotels.length > 0 && (
                <details>
                  <summary className="small">All {draft.hotels.length} places to stay nearby (OpenStreetMap)</summary>
                  <ul className="hotels">
                    {draft.hotels.map((h) => (
                      <li key={h.name + h.lat}>
                        <span>{h.name}<span className="muted small"> · {h.kind}{h.stars ? ` · ${h.stars}★` : ''} · {h.distanceKm} km</span></span>
                        <a className="small" target="_blank" rel="noreferrer" href={h.website || `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}#map=18/${h.lat}/${h.lon}`}>{h.website ? 'Website' : 'Map'}</a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>

            <article className="panel plan-card">
              <h3>Food to try</h3>
              <ul className="list">{p.food.map((f) => <li key={f.name}><strong>{f.name}</strong> · {f.where} · ~{money(f.approxUSD)}</li>)}</ul>
            </article>

            <article className="panel plan-card">
              <h3>Budget</h3>
              <ul className="bars">
                {Object.entries(p.budgetUSD).map(([k, v]) => (
                  <li key={k}><span className="cap">{k}</span><span className="bars__track"><span style={{ width: `${(v / (total || 1)) * 100}%` }} /></span><span>{money(v)}</span></li>
                ))}
              </ul>
            </article>
          </div>

          <article className="panel plan-card">
            <h3>Day by day</h3>
            <ol className="timeline">
              {p.days.map((d) => (
                <li key={d.day}><span className="timeline__day">Day {d.day}</span><div><strong>{d.title}</strong><ul>{d.items.map((i) => <li key={i}>{i}</li>)}</ul></div></li>
              ))}
            </ol>
          </article>

          <div className="plan-grid">
            <article className="panel plan-card"><h3>Pack</h3><ul className="list">{p.packing.map((x) => <li key={x}>{x}</li>)}</ul></article>
            <article className="panel plan-card"><h3>Good to know</h3><ul className="list">{p.goodToKnow.map((x) => <li key={x}>{x}</li>)}</ul></article>
          </div>

          <div className="accept panel">
            <p><strong>Happy with this plan?</strong> Accept it and Orbit saves it to your trips. When you’re back, it’ll ask what you spent and show how much you saved.</p>
            <div className="row">
              <button className="btn btn--primary" onClick={() => void accept()} disabled={busy !== null}>{busy === 'save' ? 'Saving…' : 'Accept & save trip'}</button>
              <button className="btn btn--ghost" onClick={() => void makePlan()} disabled={busy !== null}>Try another plan</button>
            </div>
          </div>
          <p className="fineprint">Costs are AI estimates converted at today’s exchange rate, not bookings. Hotel names come from OpenStreetMap; check availability and prices before booking.</p>
        </section>
      )}
    </main>
  );
}
