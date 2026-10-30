import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Trip } from '../lib/api';

export function SavedPage() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ trips: Trip[] }>('trips').then((r) => setTrips(r.trips)).catch((e: Error) => setError(e.message));
  }, []);

  async function remove(t: Trip) {
    if (!confirm(`Remove ${t.name} from your saved places?`)) return;
    await api(`trips/${t._id}`, { method: 'DELETE' }).then(() => setTrips((list) => list?.filter((x) => x._id !== t._id) ?? null))
      .catch((e: Error) => setError(e.message));
  }

  return (
    <main className="page">
      <header className="page__head">
        <p className="eyebrow">Your places</p>
        <h1>Saved</h1>
      </header>
      {error && <p className="error">{error}</p>}
      {trips?.length === 0 && <p className="panel empty">Nothing saved yet. Find a place on the <Link to="/">globe</Link> and press <strong>Save place</strong>.</p>}
      <ul className="saved-grid">
        {trips?.map((t) => (
          <li key={t._id} className="panel saved">
            <p className="eyebrow">{t.country}</p>
            <h2>{t.name}</h2>
            <p className="fineprint">Saved {new Date(t.createdAt).toLocaleDateString()}</p>
            <div className="saved__actions">
              <Link className="btn btn--primary btn--sm" to={`/?${new URLSearchParams({ name: t.name, country: t.country, cc: t.countryCode, lat: String(t.lat), lon: String(t.lon) })}`}>Open on globe</Link>
              <button className="btn btn--ghost btn--sm" onClick={() => void remove(t)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
