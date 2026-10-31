import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type SavedPlan, type Trip } from '../lib/api';
import { useSession } from '../lib/session';
import { PurposeIcon } from '../components/Icons';

const today = () => new Date().toISOString().slice(0, 10);

/** Upcoming trips, past trips with savings, and saved places */
export function TripsPage() {
  const { user, requireLogin, money } = useSession();
  const [params] = useSearchParams();
  const [plans, setPlans] = useState<SavedPlan[] | null>(null);
  const [places, setPlaces] = useState<Trip[]>([]);
  const [tab, setTab] = useState<'upcoming' | 'past' | 'places'>('upcoming');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api<{ plans: SavedPlan[] }>('plans').then((r) => setPlans(r.plans)).catch((e: Error) => setError(e.message));
    api<{ trips: Trip[] }>('trips').then((r) => setPlaces(r.trips)).catch(() => {});
  }, [user]);

  if (!user) {
    return (
      <main className="page">
        <div className="panel empty-state">
          <h1>Your trips live here</h1>
          <p className="muted">Plan a trip, accept it, and Orbit keeps it here: upcoming trips, past trips, and how much you saved.</p>
          <button className="btn btn--primary" onClick={() => requireLogin('Log in to see your trips.')}>Log in or create an account</button>
        </div>
      </main>
    );
  }

  const upcoming = (plans ?? []).filter((p) => p.status === 'upcoming').sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = (plans ?? []).filter((p) => p.status === 'completed');
  const saved = past.reduce((s, p) => s + Math.max(0, p.savedUSD ?? 0), 0);
  const km = past.reduce((s, p) => s + p.distanceKm * 2, 0);

  async function removePlan(p: SavedPlan) {
    if (!confirm(`Delete your trip to ${p.destination.name}?`)) return;
    await api(`plans/${p._id}`, { method: 'DELETE' }).then(() => setPlans((l) => l?.filter((x) => x._id !== p._id) ?? null)).catch((e: Error) => setError(e.message));
  }
  async function removePlace(t: Trip) {
    if (!confirm(`Remove ${t.name} from saved places?`)) return;
    await api(`trips/${t._id}`, { method: 'DELETE' }).then(() => setPlaces((l) => l.filter((x) => x._id !== t._id))).catch((e: Error) => setError(e.message));
  }

  return (
    <main className="page">
      <header className="page__head">
        <p className="eyebrow">My trips</p>
        <h1>Hi {user.name.split(' ')[0]}, here’s your travel</h1>
        {params.get('saved') && <p className="notice-ok">Trip saved. We’ll check in when you’re back.</p>}
      </header>

      <section className="stats-row">
        <div className="stat-card"><span>Saved with Orbit</span><strong className="grad">{money(saved)}</strong><em>vs typical trip costs</em></div>
        <div className="stat-card"><span>Trips completed</span><strong>{past.length}</strong><em>{upcoming.length} coming up</em></div>
        <div className="stat-card"><span>Distance travelled</span><strong>{Math.round(km).toLocaleString()} km</strong><em>there and back, straight-line</em></div>
      </section>

      <div className="tabs tabs--page" role="tablist">
        <button role="tab" aria-selected={tab === 'upcoming'} onClick={() => setTab('upcoming')}>Upcoming ({upcoming.length})</button>
        <button role="tab" aria-selected={tab === 'past'} onClick={() => setTab('past')}>Past trips ({past.length})</button>
        <button role="tab" aria-selected={tab === 'places'} onClick={() => setTab('places')}>Saved places ({places.length})</button>
      </div>
      {error && <p className="error">{error}</p>}
      {!plans && <div className="skeleton" style={{ height: 160 }} />}

      {tab === 'upcoming' && plans && (
        upcoming.length === 0
          ? <p className="panel empty">No upcoming trips. <Link to="/plan">Plan one</Link>.</p>
          : <ul className="trip-list">{upcoming.map((p) => (
              <li key={p._id} className="panel trip-card">
                <span className={`trip-card__icon purpose-bg--${p.purpose}`}><PurposeIcon purpose={p.purpose} size={22} /></span>
                <div className="trip-card__body">
                  <h2>{p.destination.name}</h2>
                  <p className="small muted">{p.purpose} · from {p.origin.name} · {p.startDate} → {p.endDate} · {p.travellers} traveller{p.travellers > 1 ? 's' : ''}</p>
                  <p className="small">Planned {money(p.plannedTotalUSD)} <span className="muted">(typical {money(p.typicalTotalUSD)})</span></p>
                  {p.startDate <= today() && p.endDate >= today() && <span className="tag tag--ok">On this trip now</span>}
                </div>
                <div className="trip-card__actions">
                  <Link className="btn btn--ghost btn--sm" to={`/?${new URLSearchParams({ name: p.destination.name, country: p.destination.country, cc: p.destination.countryCode, lat: String(p.destination.lat), lon: String(p.destination.lon) })}`}>Open</Link>
                  <button className="btn btn--ghost btn--sm" onClick={() => void removePlan(p)}>Delete</button>
                </div>
              </li>))}
            </ul>
      )}

      {tab === 'past' && plans && (
        past.length === 0
          ? <p className="panel empty">Completed trips appear here with what you spent and saved.</p>
          : <ul className="trip-list">{past.map((p) => (
              <li key={p._id} className="panel trip-card">
                <span className={`trip-card__icon purpose-bg--${p.purpose}`}><PurposeIcon purpose={p.purpose} size={22} /></span>
                <div className="trip-card__body">
                  <h2>{p.destination.name}</h2>
                  <p className="small muted">{p.purpose} · {p.startDate} → {p.endDate}</p>
                  <p className="small">Spent {money(p.actualSpentUSD ?? 0)} · planned {money(p.plannedTotalUSD)}</p>
                </div>
                <div className={`saved-badge ${(p.savedUSD ?? 0) >= 0 ? '' : 'saved-badge--over'}`}>
                  <span>{(p.savedUSD ?? 0) >= 0 ? 'Saved' : 'Over by'}</span><strong>{money(Math.abs(p.savedUSD ?? 0))}</strong>
                </div>
              </li>))}
            </ul>
      )}

      {tab === 'places' && (
        places.length === 0
          ? <p className="panel empty">No saved places. Press <strong>Save place</strong> on the globe.</p>
          : <ul className="saved-grid">{places.map((t) => (
              <li key={t._id} className="panel saved">
                <p className="eyebrow">{t.country}</p>
                <h2>{t.name}</h2>
                {t.note && <p className="fineprint">{t.note}</p>}
                <div className="saved__actions">
                  <Link className="btn btn--primary btn--sm" to={`/?${new URLSearchParams({ name: t.name, country: t.country, cc: t.countryCode, lat: String(t.lat), lon: String(t.lon) })}`}>Open</Link>
                  <button className="btn btn--ghost btn--sm" onClick={() => void removePlace(t)}>Remove</button>
                </div>
              </li>))}
            </ul>
      )}
    </main>
  );
}
