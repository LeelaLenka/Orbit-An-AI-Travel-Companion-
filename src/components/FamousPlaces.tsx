import type { Attraction } from '../lib/api';

/** Well-known places within 10 km, most-read on Wikipedia first */
export function FamousPlaces({ items, loading, onPick }: { items: Attraction[]; loading: boolean; onPick: (a: Attraction) => void }) {
  if (loading) return <div className="skeleton" style={{ height: 320 }} aria-label="Loading famous places" />;
  if (items.length === 0) return <p className="muted">No well-known landmarks within 10 km of this spot. Try searching the nearest town.</p>;
  return (
    <div className="famous">
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
