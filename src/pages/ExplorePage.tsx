import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type Place, type Trip } from '../lib/api';
import type { Marker } from '../components/GlobeView';
import { PlaceSearch } from '../components/PlaceSearch';
import { ScanPanel } from '../components/ScanPanel';
import { WeatherCard } from '../components/WeatherCard';

// The 3D engine (three.js) is large, so it loads separately after sign-in
const GlobeView = lazy(() => import('../components/GlobeView').then((m) => ({ default: m.GlobeView })));

type Selected = Pick<Place, 'name' | 'admin' | 'country' | 'countryCode' | 'lat' | 'lon'>;

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<Selected | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tab, setTab] = useState<'weather' | 'scan'>('weather');
  const [imageryDate, setImageryDate] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api<{ trips: Trip[] }>('trips').then((r) => setTrips(r.trips)).catch(() => {});
  }, []);

  // Open a place passed in the URL (from Saved or the Budget planner)
  useEffect(() => {
    const lat = Number(params.get('lat'));
    const lon = Number(params.get('lon'));
    const name = params.get('name');
    if (name && Number.isFinite(lat) && Number.isFinite(lon)) {
      setSelected({ name, admin: params.get('admin') ?? '', country: params.get('country') ?? '', countryCode: params.get('cc') ?? '', lat, lon });
      setTab(params.get('tab') === 'scan' ? 'scan' : 'weather');
    }
  }, [params]);

  const pick = (p: Selected) => {
    setSelected(p);
    setTab('weather');
    setNotice('');
    setParams({ name: p.name, admin: p.admin, country: p.country, cc: p.countryCode, lat: String(p.lat), lon: String(p.lon) }, { replace: true });
  };

  const savedHere = selected && trips.find((t) => Math.abs(t.lat - selected.lat) < 0.01 && Math.abs(t.lon - selected.lon) < 0.01);

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await api<{ trip: Trip }>('trips', { method: 'POST', body: { name: selected.name, country: selected.country, countryCode: selected.countryCode, lat: selected.lat, lon: selected.lon } });
      setTrips([r.trip, ...trips]);
      setNotice('Saved to your places.');
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const markers = useMemo<Marker[]>(() => [
    ...trips.map((t) => ({ id: t._id, lat: t.lat, lon: t.lon, label: `${t.name}, ${t.country}`, kind: 'saved' as const })),
    ...(selected ? [{ id: 'sel', lat: selected.lat, lon: selected.lon, label: selected.name, kind: 'selected' as const }] : []),
  ], [trips, selected]);

  const focus = useMemo(() => (selected ? { lat: selected.lat, lon: selected.lon } : null), [selected]);

  return (
    <main className="explore">
      <Suspense fallback={<div className="globe globe--fallback"><p className="muted">Loading the globe…</p></div>}>
        <GlobeView markers={markers} focus={focus} onImageryDate={setImageryDate} />
      </Suspense>

      <div className="explore__search">
        <PlaceSearch onPick={pick} />
        {!selected && <p className="hint">Search anywhere on Earth, or drag the globe to look around.</p>}
      </div>

      {selected && (
        <aside className="place panel" aria-label={`${selected.name} details`}>
          <header className="place__head">
            <div>
              <p className="eyebrow">{[selected.admin, selected.country].filter(Boolean).join(' · ')}</p>
              <h1>{selected.name}</h1>
              <p className="fineprint">{selected.lat.toFixed(3)}°, {selected.lon.toFixed(3)}°</p>
            </div>
            <button className="icon-btn" aria-label="Close" onClick={() => { setSelected(null); setParams({}, { replace: true }); }}>×</button>
          </header>
          <div className="place__actions">
            {savedHere ? <span className="tag">Saved</span> : <button className="btn btn--ghost btn--sm" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save place'}</button>}
            {notice && <span className="small muted" role="status">{notice}</span>}
          </div>
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'weather'} onClick={() => setTab('weather')}>Weather</button>
            <button role="tab" aria-selected={tab === 'scan'} onClick={() => setTab('scan')}>AI scan</button>
          </div>
          <div className="place__body">
            {tab === 'weather' ? <WeatherCard lat={selected.lat} lon={selected.lon} /> : <ScanPanel place={selected} />}
          </div>
        </aside>
      )}

      <p className="credit">
        {imageryDate ? `Earth imagery: NASA GIBS satellites, ${imageryDate}` : imageryDate === null ? 'Earth imagery: NASA Blue Marble' : 'Loading NASA imagery…'}
      </p>
    </main>
  );
}
