import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type Place, type PlaceInfo, type Trip } from '../lib/api';
import type { Marker } from '../components/GlobeView';
import { FamousPlaces } from '../components/FamousPlaces';
import { PlaceOverview } from '../components/PlaceOverview';
import { PlaceSearch } from '../components/PlaceSearch';
import { ScanPanel } from '../components/ScanPanel';
import { WeatherCard } from '../components/WeatherCard';

// The 3D engine and the map library are large, so they load separately after sign-in
const GlobeView = lazy(() => import('../components/GlobeView').then((m) => ({ default: m.GlobeView })));
const MapView = lazy(() => import('../components/MapView').then((m) => ({ default: m.MapView })));

type Selected = Pick<Place, 'name' | 'detail' | 'admin' | 'country' | 'countryCode' | 'lat' | 'lon' | 'precise'>;
type Tab = 'overview' | 'places' | 'weather' | 'scan';

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<Selected | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [view, setView] = useState<'globe' | 'map'>('globe');
  const [mapFocus, setMapFocus] = useState<{ lat: number; lon: number; zoom: number } | null>(null);
  const [info, setInfo] = useState<PlaceInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [imageryDate, setImageryDate] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api<{ trips: Trip[] }>('trips').then((r) => setTrips(r.trips)).catch(() => {});
  }, []);

  /** Shows a place: exact addresses and landmarks open the street map, cities fly the globe */
  const open = useCallback((p: Selected, initialTab: Tab = 'overview') => {
    setSelected(p);
    setTab(initialTab);
    setNotice('');
    setView(p.precise ? 'map' : 'globe');
    setMapFocus({ lat: p.lat, lon: p.lon, zoom: p.precise ? 17 : 13 });
    setInfo(null);
    setInfoLoading(true);
    const qs = new URLSearchParams({ lat: String(p.lat), lon: String(p.lon), name: p.name, cc: p.countryCode });
    api<{ info: PlaceInfo }>(`place-info?${qs}`)
      .then((r) => setInfo(r.info))
      .catch(() => setInfo(null))
      .finally(() => setInfoLoading(false));
  }, []);

  // Open a place passed in the URL (from Saved, the Budget planner, or a shared link)
  useEffect(() => {
    const lat = Number(params.get('lat'));
    const lon = Number(params.get('lon'));
    const name = params.get('name');
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    if (selected && selected.lat === lat && selected.lon === lon && selected.name === name) return;
    open({ name, detail: params.get('detail') ?? '', admin: params.get('admin') ?? '', country: params.get('country') ?? '',
      countryCode: params.get('cc') ?? '', lat, lon, precise: params.get('p') === '1' }, params.get('tab') === 'scan' ? 'scan' : 'overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const pick = (p: Place) => {
    setParams({ name: p.name, detail: p.detail, admin: p.admin, country: p.country, cc: p.countryCode, lat: String(p.lat), lon: String(p.lon), p: p.precise ? '1' : '0' }, { replace: true });
    open(p);
  };

  const showAttraction = useCallback((a: { lat: number; lon: number }) => {
    setView('map');
    setMapFocus({ lat: a.lat, lon: a.lon, zoom: 17 });
  }, []);

  const savedHere = selected && trips.find((t) => Math.abs(t.lat - selected.lat) < 0.0005 && Math.abs(t.lon - selected.lon) < 0.0005);

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await api<{ trip: Trip }>('trips', { method: 'POST', body: { name: selected.name, country: selected.country, countryCode: selected.countryCode, lat: selected.lat, lon: selected.lon, note: selected.detail } });
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
    ...(info?.attractions ?? []).map((a) => ({ id: `a:${a.title}`, lat: a.lat, lon: a.lon, label: a.title, kind: 'suggestion' as const })),
    ...(selected ? [{ id: 'sel', lat: selected.lat, lon: selected.lon, label: selected.name, kind: 'selected' as const }] : []),
  ], [trips, info, selected]);

  const globeFocus = useMemo(() => (selected ? { lat: selected.lat, lon: selected.lon } : null), [selected]);
  const onMarkerClick = useCallback((m: Marker) => showAttraction(m), [showAttraction]);

  return (
    <main className="explore">
      <Suspense fallback={<div className="globe globe--fallback"><p className="muted">Loading…</p></div>}>
        {view === 'globe'
          ? <GlobeView markers={markers} focus={globeFocus} onImageryDate={setImageryDate} />
          : <MapView markers={markers} focus={mapFocus} zoom={mapFocus?.zoom ?? 13} onMarkerClick={onMarkerClick} />}
      </Suspense>

      <div className="explore__search">
        <PlaceSearch onPick={pick} />
        {!selected && <p className="hint">Search an exact address, a landmark or any town on Earth.</p>}
      </div>

      <div className="seg seg--view" role="group" aria-label="View">
        <button aria-pressed={view === 'globe'} onClick={() => setView('globe')}>Globe</button>
        <button aria-pressed={view === 'map'} onClick={() => { setView('map'); if (!mapFocus && selected) setMapFocus({ lat: selected.lat, lon: selected.lon, zoom: 13 }); }}>Street map</button>
      </div>

      {selected && (
        <aside className="place panel" aria-label={`${selected.name} details`}>
          <header className="place__head">
            <div>
              <p className="eyebrow">{[selected.admin, selected.country].filter(Boolean).join(' · ')}</p>
              <h1>{selected.name}</h1>
              {selected.detail && <p className="small muted">{selected.detail}</p>}
              <p className="fineprint">{selected.lat.toFixed(5)}°, {selected.lon.toFixed(5)}°</p>
            </div>
            <button className="icon-btn" aria-label="Close" onClick={() => { setSelected(null); setInfo(null); setParams({}, { replace: true }); }}>×</button>
          </header>
          <div className="place__actions">
            {savedHere ? <span className="tag">Saved</span> : <button className="btn btn--ghost btn--sm" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save place'}</button>}
            <a className="btn btn--ghost btn--sm" target="_blank" rel="noreferrer"
               href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lon}`}>Directions</a>
            {notice && <span className="small muted" role="status">{notice}</span>}
          </div>
          <div className="tabs tabs--4" role="tablist">
            <button role="tab" aria-selected={tab === 'overview'} onClick={() => setTab('overview')}>Overview</button>
            <button role="tab" aria-selected={tab === 'places'} onClick={() => setTab('places')}>Places{info?.attractions.length ? <span className="count">{info.attractions.length}</span> : null}</button>
            <button role="tab" aria-selected={tab === 'weather'} onClick={() => setTab('weather')}>Weather</button>
            <button role="tab" aria-selected={tab === 'scan'} onClick={() => setTab('scan')}>AI scan</button>
          </div>
          <div className="place__body">
            {tab === 'overview' && <PlaceOverview info={info} loading={infoLoading} onShowAll={() => setTab('places')} onPick={showAttraction} />}
            {tab === 'places' && <FamousPlaces items={info?.attractions ?? []} loading={infoLoading} onPick={showAttraction} />}
            {tab === 'weather' && <WeatherCard lat={selected.lat} lon={selected.lon} />}
            {tab === 'scan' && <ScanPanel place={selected} />}
          </div>
        </aside>
      )}

      {view === 'globe' && (
        <p className="credit">
          {imageryDate ? `Earth imagery: NASA GIBS satellites, ${imageryDate}` : imageryDate === null ? 'Earth imagery: NASA Blue Marble' : 'Loading NASA imagery…'}
        </p>
      )}
    </main>
  );
}
