import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Mode, type Place, type RouteInfo } from '../lib/api';
import { useSession } from '../lib/session';
import { LocateIcon, ModeIcon } from './Icons';
import { PlaceSearch } from './PlaceSearch';
import { usePrefs } from '../lib/prefs';

const LABEL: Record<Mode, string> = { walk: 'Walk', bike: 'Bike', car: 'Car', flight: 'Flight', ship: 'Ship' };

export function duration(min: number): string {
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  if (h >= 24) return `${Math.floor(h / 24)} d ${h % 24} h`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Distance and travel time by every mode, from your location or any place you choose */
export function GettingThere({ to }: { to: { name: string; lat: number; lon: number } }) {
  const { locate, myLocation } = useSession();
  const { dist } = usePrefs();
  const [from, setFrom] = useState<{ name: string; lat: number; lon: number } | null>(myLocation ? { name: 'Your location', ...myLocation } : null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!from) return;
    setBusy(true);
    setError('');
    setRoute(null);
    api<{ route: RouteInfo }>(`route?fromLat=${from.lat}&fromLon=${from.lon}&toLat=${to.lat}&toLon=${to.lon}`)
      .then((r) => setRoute(r.route))
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  }, [from, to.lat, to.lon]);

  async function useMine() {
    setError('');
    try {
      const loc = await locate();
      setFrom({ name: 'Your location', ...loc });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const plan = new URLSearchParams({ name: to.name, lat: String(to.lat), lon: String(to.lon) });
  if (from) plan.set('from', JSON.stringify(from));

  return (
    <div className="travel">
      <div className="travel__from">
        <p className="small"><strong>From:</strong> {from ? from.name : 'choose a starting point'}</p>
        <button className="btn btn--ghost btn--sm" onClick={() => void useMine()}><LocateIcon size={16} /> My location</button>
      </div>
      <PlaceSearch placeholder="…or search a starting point" onPick={(p: Place) => setFrom({ name: p.name, lat: p.lat, lon: p.lon })} />

      {busy && <div className="skeleton" style={{ height: 220 }} aria-label="Calculating routes" />}
      {error && <p className="error">{error}</p>}
      {route && (
        <>
          <p className="travel__straight">
            <strong>{dist(route.straightKm)}</strong> <span className="muted">in a straight line (great-circle distance)</span>
          </p>
          <ul className="modes">
            {route.modes.map((m) => (
              <li key={m.mode} className={`mode ${m.available ? '' : 'mode--off'} ${route.recommended === m.mode ? 'mode--best' : ''}`}>
                <span className="mode__icon"><ModeIcon mode={m.mode} size={22} /></span>
                <span className="mode__body">
                  <strong>{LABEL[m.mode]}</strong>
                  <span className="muted small">{m.available ? `${dist(m.distanceKm)} · ${m.note}` : m.note}</span>
                </span>
                <span className="mode__time">
                  {m.available ? duration(m.minutes) : '—'}
                  {m.available && <em>{m.source === 'road network' ? 'route' : 'estimate'}</em>}
                </span>
                {route.recommended === m.mode && <span className="mode__badge">Recommended</span>}
              </li>
            ))}
          </ul>
          {!route.modes.find((m) => m.mode === 'walk')?.available && (
            <p className="small muted">Too far to walk. Recommended: <strong>{LABEL[route.recommended].toLowerCase()}</strong>.</p>
          )}
          <p className="fineprint">Walk, bike and car times follow real roads (OpenStreetMap routing), without traffic. Flight and ship are estimates from distance.</p>
          <Link className="btn btn--primary btn--block" to={`/plan?${plan}`}>Plan a full trip here</Link>
        </>
      )}
    </div>
  );
}
