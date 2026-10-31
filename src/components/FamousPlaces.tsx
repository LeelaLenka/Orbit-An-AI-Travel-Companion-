import { useState } from 'react';
import type { Attraction } from '../lib/api';
import { planRoute } from '../lib/geo';

/** Well-known places within 10 km, most-read on Wikipedia first, plus a route planner through them */
export function FamousPlaces({ items, loading, start, onPick, onRoute }: {
  items: Attraction[]; loading: boolean; start: { lat: number; lon: number };
  onPick: (a: Attraction) => void; onRoute: (path: { lat: number; lon: number }[] | null) => void;
}) {
  const [route, setRoute] = useState<{ ordered: Attraction[]; km: number; naiveKm: number } | null>(null);
  if (loading) return <div className="skeleton" style={{ height: 320 }} aria-label="Loading famous places" />;
  if (items.length === 0) return <p className="muted">No well-known landmarks within 10 km of this spot. Try searching the nearest town.</p>;

  const makeRoute = () => {
    const r = planRoute(start, items.slice(0, 8));
    setRoute(r);
    onRoute([start, ...r.ordered]);
  };

  return (
    <div className="famous">
      <div className="route-box">
        <div>
          <strong>Visit the top {Math.min(8, items.length)} in one go</strong>
          <p className="fineprint">Finds a short visiting order (nearest-neighbour + 2-opt route optimisation) and draws it on the map.</p>
        </div>
        {route
          ? <button className="btn btn--ghost btn--sm" onClick={() => { setRoute(null); onRoute(null); }}>Clear route</button>
          : <button className="btn btn--primary btn--sm" onClick={makeRoute}>Plan route</button>}
      </div>
      {route && (
        <div className="route-result">
          <p><strong>{route.km} km</strong> in this order{route.naiveKm > route.km ? <span className="muted">, {Math.round((route.naiveKm - route.km) * 10) / 10} km shorter than the listed order</span> : null}.</p>
          <ol>{route.ordered.map((a) => <li key={a.title}>{a.title}</li>)}</ol>
        </div>
      )}
      <p className="fineprint">Within 10 km, ranked by how many people read about them on Wikipedia last month.</p>
      <ul>
        {items.map((a, i) => (
          <li key={a.title} className="famous__item">
            {a.image ? <img src={a.image} alt="" loading="lazy" /> : <span className="famous__ph" aria-hidden="true">{i + 1}</span>}
            <div className="famous__body">
              <h3>{a.title}</h3>
              {a.description && <p className="muted small">{a.description}</p>}
              {a.extract && <p className="small">{a.extract}</p>}
              <div className="famous__actions">
                <span className="tag">{a.distanceKm} km</span>
                <button className="btn btn--ghost btn--sm" onClick={() => onPick(a)}>Show on map</button>
                <a className="small" href={a.url} target="_blank" rel="noreferrer">Wikipedia</a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
