import { useEffect, useState } from 'react';
import { api, type Attraction, type Featured, type PlaceInfo } from '../lib/api';
import { useSession } from '../lib/session';
import { LocateIcon, PurposeIcon } from './Icons';
import { usePrefs } from '../lib/prefs';

/** The landing view over the globe: headline, "near you" recommendations and featured destinations with photos */
export function HomeOverlay({ onOpen }: { onOpen: (p: { name: string; country: string; countryCode: string; lat: number; lon: number }) => void }) {
  const { locate } = useSession();
  const { dist } = usePrefs();
  const [featured, setFeatured] = useState<Featured[]>([]);
  const [near, setNear] = useState<Attraction[] | null>(null);
  const [nearState, setNearState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [nearError, setNearError] = useState('');

  useEffect(() => {
    api<{ places: Featured[] }>('featured').then((r) => setFeatured(r.places)).catch(() => {});
  }, []);

  async function findNear() {
    setNearState('busy');
    try {
      const loc = await locate();
      const r = await api<{ info: PlaceInfo }>(`place-info?lat=${loc.lat}&lon=${loc.lon}&name=`);
      setNear(r.info.attractions);
      setNearState('idle');
    } catch (e) {
      setNearError((e as Error).message);
      setNearState('error');
    }
  }

  return (
    <>
      <section className="hero" aria-label="Welcome">
        <h1>Where to <span className="grad">next?</span></h1>
        <p>Spin the live NASA globe, search any address, or let Orbit plan the whole trip.</p>
        <div className="hero__actions">
          <button className="btn btn--primary" onClick={() => void findNear()} disabled={nearState === 'busy'}>
            <LocateIcon size={18} /> {nearState === 'busy' ? 'Finding you…' : 'Recommend places near me'}
          </button>
        </div>
        {nearState === 'error' && <p className="error small">{nearError}</p>}
        {near && (
          <div className="near panel">
            <h2>Near you</h2>
            {near.length === 0 && <p className="muted small">No famous landmarks within 10 km. Try the featured trips below.</p>}
            <ul>
              {near.slice(0, 5).map((a) => (
                <li key={a.title}>
                  <button onClick={() => onOpen({ name: a.title, country: '', countryCode: '', lat: a.lat, lon: a.lon })}>
                    {a.image ? <img src={a.image} alt="" loading="lazy" /> : <span className="near__ph" aria-hidden="true" />}
                    <span><strong>{a.title}</strong><span className="muted small">{dist(a.distanceKm)} · {a.description || 'Landmark'}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {featured.length > 0 && (
        <section className="featured" aria-label="Featured destinations">
          {featured.map((f) => (
            <button key={f.name} className="feature-card" onClick={() => onOpen({ name: f.name, country: f.country, countryCode: f.cc, lat: f.lat, lon: f.lon })}
              style={f.image ? { backgroundImage: `linear-gradient(180deg, rgba(7,11,26,0) 35%, rgba(7,11,26,.92)), url(${f.image})` } : undefined}>
              <span className="feature-card__tag"><PurposeIcon purpose={f.tag === 'Pilgrimage' ? 'Pilgrimage' : f.tag === 'Adventure' ? 'Adventure' : 'Vacation'} size={14} /> {f.tag}</span>
              <span className="feature-card__name">{f.name}</span>
              <span className="feature-card__country">{f.country}</span>
            </button>
          ))}
        </section>
      )}
    </>
  );
}
