import { env } from './env.js';
import { HttpError } from './http.js';
import { store } from './store.js';
import { haversineKm, parseCoordinates } from './geo.js';
import * as mock from './mock-data.js';

/** Live data from free, keyless public services */

async function fetchJson<T>(url: string, what: string): Promise<T> {
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'Orbit travel app' } });
  if (!r.ok) throw new HttpError(502, `${what} is unavailable right now. Try again shortly.`);
  return (await r.json()) as T;
}

export interface Place {
  id: string;
  name: string;
  /** Street, area, city, state — whatever is known — for telling similar results apart */
  detail: string;
  /** house | street | landmark | locality | city | region | country */
  kind: string;
  /** true for addresses, streets and landmarks, which need the street map rather than the globe */
  precise: boolean;
  admin: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
}

const UA = 'OrbitTravel/1.0 (https://orbit-an-ai-travel-companion.vercel.app)';

/**
 * Search addresses, streets, villages, landmarks and cities (Photon, built on OpenStreetMap).
 * Falls back to Open-Meteo's city search if Photon is unavailable.
 */
export async function searchPlaces(q: string): Promise<Place[]> {
  const coords = parseCoordinates(q);
  if (coords) return [await reversePlace(coords.lat, coords.lon)];
  if (env.mockExternal) return mock.places.filter((p) => (p.name + ' ' + p.detail).toLowerCase().includes(q.toLowerCase().slice(0, 4)));
  const key = `places:${q.toLowerCase()}`;
  const cached = await store.cacheGet<Place[]>(key);
  if (cached) return cached;
  let places: Place[];
  try {
    places = await photon(q);
  } catch {
    places = await openMeteoPlaces(q);
  }
  await store.cacheSet(key, places, 7 * 86_400);
  return places;
}

async function photon(q: string): Promise<Place[]> {
  type F = { geometry: { coordinates: [number, number] }; properties: Record<string, string | undefined> };
  const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en`, {
    signal: AbortSignal.timeout(8000), headers: { 'User-Agent': UA },
  });
  if (!r.ok) throw new Error('photon');
  const data = (await r.json()) as { features?: F[] };
  const LANDMARK_KEYS = ['tourism', 'historic', 'amenity', 'leisure', 'building', 'shop', 'natural', 'man_made', 'aeroway', 'railway'];
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const street = [p.housenumber, p.street].filter(Boolean).join(' ');
    const name = p.name ?? (street || p.city || p.county || p.state || p.country || q);
    const type = p.type ?? 'other';
    const kind =
      type === 'house' ? 'house' :
      type === 'street' ? 'street' :
      LANDMARK_KEYS.includes(p.osm_key ?? '') ? 'landmark' :
      ['city', 'town'].includes(type) || ['city', 'town'].includes(p.osm_value ?? '') ? 'city' :
      ['district', 'locality', 'village', 'hamlet', 'suburb', 'neighbourhood'].includes(type) || ['village', 'hamlet', 'suburb'].includes(p.osm_value ?? '') ? 'locality' :
      type === 'country' ? 'country' : type === 'state' || type === 'county' ? 'region' : 'landmark';
    const detail = [p.name && street && street !== p.name ? street : '', p.district, p.city !== name ? p.city : '', p.county !== name ? p.county : '', p.state !== name ? p.state : '', p.postcode, p.country !== name ? p.country : '']
      .filter((x, i, a) => x && a.indexOf(x) === i).join(', ');
    const id = `${p.osm_type ?? 'X'}${p.osm_id ?? `${lat},${lon}`}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name, detail, kind, precise: ['house', 'street', 'landmark'].includes(kind), admin: p.state ?? '',
      country: p.country ?? '', countryCode: (p.countrycode ?? '').toUpperCase(), lat, lon });
  }
  return out;
}

/** Names an exact coordinate (Photon reverse geocoding); the pin stays exactly where the user asked */
export async function reversePlace(lat: number, lon: number): Promise<Place> {
  const label = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  const base: Place = { id: `pt${label}`, name: label, detail: 'Exact coordinates', kind: 'point', precise: true, admin: '', country: '', countryCode: '', lat, lon };
  if (env.mockExternal) return { ...base, detail: 'Near Fort Road, Vizianagaram, Andhra Pradesh, India', admin: 'Andhra Pradesh', country: 'India', countryCode: 'IN' };
  try {
    const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=en`, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': UA } });
    const d = (await r.json()) as { features?: { properties: Record<string, string | undefined> }[] };
    const p = d.features?.[0]?.properties;
    if (!p) return base;
    const near = [p.name, [p.housenumber, p.street].filter(Boolean).join(' '), p.district, p.city, p.state, p.country].filter((x, i, a) => x && a.indexOf(x) === i).join(', ');
    return { ...base, detail: near ? `Near ${near}` : base.detail, admin: p.state ?? '', country: p.country ?? '', countryCode: (p.countrycode ?? '').toUpperCase() };
  } catch {
    return base;
  }
}

async function openMeteoPlaces(q: string): Promise<Place[]> {
  type R = { results?: { id: number; name: string; admin1?: string; country?: string; country_code?: string; latitude: number; longitude: number }[] };
  const data = await fetchJson<R>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`, 'Place search');
  return (data.results ?? []).map((p) => ({
    id: `om${p.id}`, name: p.name, detail: [p.admin1, p.country].filter(Boolean).join(', '), kind: 'city', precise: false,
    admin: p.admin1 ?? '', country: p.country ?? '', countryCode: p.country_code ?? '', lat: p.latitude, lon: p.longitude,
  }));
}

// ---------------- Place details for travellers ----------------
export interface Attraction {
  title: string; description: string; extract: string; image: string | null;
  lat: number; lon: number; distanceKm: number; url: string; views: number;
}
export interface CountryFacts {
  name: string; capital: string; region: string; currencies: { code: string; name: string; symbol: string }[];
  languages: string[]; callingCode: string; drivingSide: string; timezones: string[]; flag: string;
}
export interface PlaceInfo {
  about: { title: string; extract: string; image: string | null; url: string } | null;
  country: CountryFacts | null;
  attractions: Attraction[];
}

const distanceKm = haversineKm;

/** Articles that are places on a map but not things a visitor goes to see */
const NOT_ATTRACTION = /\b(constituency|mandal|tehsil|taluk|village|census town|neighbourhood|neighborhood|suburb|ward|school|college|university|railway station|metro station|bus station|bus stop|hospital|company|district of|municipality|panchayat|electoral|road in|highway|street in|apartment|residential)\b/i;

/** Wikipedia (place description + famous places nearby) and REST Countries (facts), cached for a week */
export async function getPlaceInfo(lat: number, lon: number, name: string, countryCode: string): Promise<PlaceInfo> {
  if (env.mockExternal) return mock.placeInfo(lat, lon, name);
  const key = `info:v1:${lat.toFixed(3)},${lon.toFixed(3)}:${name.toLowerCase()}:${countryCode}`;
  const cached = await store.cacheGet<PlaceInfo>(key);
  if (cached) return cached;

  const [nearby, country] = await Promise.all([
    wikiNearby(lat, lon).catch(() => [] as (Attraction & { pageTitle: string })[]),
    countryCode ? countryFacts(countryCode).catch(() => null) : Promise.resolve(null),
  ]);

  // The place's own article: a nearby article with a matching title, else look it up by name and check it's close
  const lname = name.toLowerCase();
  let aboutPage = nearby.find((a) => a.title.toLowerCase() === lname || a.title.toLowerCase().startsWith(`${lname},`)) ?? null;
  let about: PlaceInfo['about'] = aboutPage ? { title: aboutPage.title, extract: aboutPage.extract, image: aboutPage.image, url: aboutPage.url } : null;
  if (!about) about = await wikiSummary(name, lat, lon).catch(() => null);

  const attractions = nearby
    .filter((a) => a !== aboutPage && a.title !== about?.title && !NOT_ATTRACTION.test(`${a.description} ${a.title}`))
    .sort((a, b) => b.views - a.views)
    .slice(0, 12)
    .map(({ pageTitle: _t, ...a }) => a);

  const info: PlaceInfo = { about, country, attractions };
  await store.cacheSet(key, info, 7 * 86_400);
  return info;
}

async function wikiNearby(lat: number, lon: number): Promise<(Attraction & { pageTitle: string })[]> {
  const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2' +
    `&generator=geosearch&ggscoord=${lat}|${lon}&ggsradius=10000&ggslimit=40` +
    '&prop=coordinates|pageimages|description|extracts|pageviews&piprop=thumbnail&pithumbsize=480' +
    '&exintro=1&explaintext=1&exsentences=2&exlimit=20&pvipdays=30';
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('wiki');
  type P = { title: string; coordinates?: { lat: number; lon: number }[]; thumbnail?: { source: string }; description?: string; extract?: string; pageviews?: Record<string, number | null> };
  const data = (await r.json()) as { query?: { pages?: P[] } };
  return (data.query?.pages ?? []).filter((p) => p.coordinates?.[0]).map((p) => {
    const c = p.coordinates![0]!;
    return {
      pageTitle: p.title, title: p.title, description: p.description ?? '', extract: p.extract ?? '',
      image: p.thumbnail?.source ?? null, lat: c.lat, lon: c.lon,
      distanceKm: Math.round(distanceKm(lat, lon, c.lat, c.lon) * 10) / 10,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
      views: Object.values(p.pageviews ?? {}).reduce<number>((s, v) => s + (v ?? 0), 0),
    };
  });
}

async function wikiSummary(title: string, lat: number, lon: number): Promise<PlaceInfo['about']> {
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`, {
    signal: AbortSignal.timeout(8000), headers: { 'User-Agent': UA },
  });
  if (!r.ok) return null;
  const d = (await r.json()) as { type?: string; title: string; extract?: string; thumbnail?: { source: string }; coordinates?: { lat: number; lon: number }; content_urls?: { desktop?: { page?: string } } };
  if (d.type !== 'standard' || !d.extract) return null;
  if (d.coordinates && distanceKm(lat, lon, d.coordinates.lat, d.coordinates.lon) > 40) return null; // a different place with the same name
  return { title: d.title, extract: d.extract, image: d.thumbnail?.source ?? null, url: d.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}` };
}

async function countryFacts(cc: string): Promise<CountryFacts | null> {
  type C = {
    name: { common: string }; capital?: string[]; region?: string; subregion?: string;
    currencies?: Record<string, { name: string; symbol?: string }>; languages?: Record<string, string>;
    idd?: { root?: string; suffixes?: string[] }; car?: { side?: string }; timezones?: string[]; flags?: { svg?: string };
  };
  const c = await fetchJson<C>(`https://restcountries.com/v3.1/alpha/${encodeURIComponent(cc)}?fields=name,capital,region,subregion,currencies,languages,idd,car,timezones,flags`, 'Country facts');
  const suffixes = c.idd?.suffixes ?? [];
  return {
    name: c.name.common, capital: c.capital?.join(', ') ?? '', region: c.subregion || c.region || '',
    currencies: Object.entries(c.currencies ?? {}).map(([code, v]) => ({ code, name: v.name, symbol: v.symbol ?? '' })),
    languages: Object.values(c.languages ?? {}),
    callingCode: c.idd?.root ? (suffixes.length === 1 ? c.idd.root + suffixes[0] : c.idd.root) : '',
    drivingSide: c.car?.side ?? '', timezones: c.timezones ?? [], flag: c.flags?.svg ?? '',
  };
}

export interface Weather {
  timezone: string;
  current: { temperature: number; feelsLike: number; humidity: number; windSpeed: number; precipitation: number; code: number; isDay: boolean; time: string };
  daily: { date: string; code: number; max: number; min: number; rainChance: number; sunrise: string; sunset: string }[];
}

/** Current conditions and a 7-day forecast (Open-Meteo, from national weather services) */
export async function getWeather(lat: number, lon: number): Promise<Weather> {
  if (env.mockExternal) return mock.weather;
  const key = `wx:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = await store.cacheGet<Weather>(key);
  if (cached) return cached;
  type R = {
    timezone: string;
    current: { time: string; temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; precipitation: number; weather_code: number; is_day: number };
    daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[]; sunrise: string[]; sunset: string[] };
  };
  const d = await fetchJson<R>(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset' +
      '&timezone=auto&forecast_days=7', 'The weather service');
  const w: Weather = {
    timezone: d.timezone,
    current: {
      temperature: d.current.temperature_2m, feelsLike: d.current.apparent_temperature, humidity: d.current.relative_humidity_2m,
      windSpeed: d.current.wind_speed_10m, precipitation: d.current.precipitation, code: d.current.weather_code,
      isDay: d.current.is_day === 1, time: d.current.time,
    },
    daily: d.daily.time.map((date, i) => ({
      date, code: d.daily.weather_code[i] ?? 0, max: d.daily.temperature_2m_max[i] ?? 0, min: d.daily.temperature_2m_min[i] ?? 0,
      rainChance: d.daily.precipitation_probability_max[i] ?? 0, sunrise: d.daily.sunrise[i] ?? '', sunset: d.daily.sunset[i] ?? '',
    })),
  };
  await store.cacheSet(key, w, 15 * 60); // weather changes; keep for 15 minutes
  return w;
}

export interface Rates { base: 'USD'; updated: string; rates: Record<string, number> }

/** Exchange rates against USD for 160+ currencies (ExchangeRate-API open access, updated daily) */
export async function getRates(): Promise<Rates> {
  if (env.mockExternal) return mock.rates;
  const cached = await store.cacheGet<Rates>('rates:USD');
  if (cached) return cached;
  const d = await fetchJson<{ result: string; time_last_update_utc: string; rates: Record<string, number> }>(
    'https://open.er-api.com/v6/latest/USD', 'Exchange rates');
  if (d.result !== 'success') throw new HttpError(502, 'Exchange rates are unavailable right now.');
  const r: Rates = { base: 'USD', updated: d.time_last_update_utc, rates: d.rates };
  await store.cacheSet('rates:USD', r, 6 * 3600);
  return r;
}

/**
 * Yesterday's Earth from NASA satellites (GIBS), as one equirectangular image for the 3D globe.
 * VIIRS true-colour passes from two satellites, with NASA's Blue Marble filling gaps between swaths.
 */
export async function getSatelliteImage(): Promise<{ bytes: Buffer; date: string; type: string }> {
  const d = new Date(Date.now() - 36 * 3600 * 1000); // yesterday's mosaic is complete by now
  const date = d.toISOString().slice(0, 10);
  if (env.mockExternal) return { bytes: mock.satelliteJpeg(), date, type: 'image/png' };
  const layers = ['BlueMarble_ShadedRelief_Bathymetry', 'VIIRS_SNPP_CorrectedReflectance_TrueColor', 'VIIRS_NOAA20_CorrectedReflectance_TrueColor'].join(',');
  const url = 'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&CRS=EPSG:4326&BBOX=-90,-180,90,180' +
    `&LAYERS=${layers}&FORMAT=image/jpeg&WIDTH=2048&HEIGHT=1024&TIME=${date}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok || !(r.headers.get('content-type') ?? '').includes('image')) throw new HttpError(502, 'NASA imagery is unavailable right now.');
  return { bytes: Buffer.from(await r.arrayBuffer()), date, type: 'image/jpeg' };
}

// ---------------- Getting there ----------------
export type Mode = 'walk' | 'bike' | 'car' | 'flight' | 'ship';
export interface ModeEstimate { mode: Mode; available: boolean; distanceKm: number; minutes: number; source: 'road network' | 'estimate'; note: string }
export interface RouteResult { straightKm: number; modes: ModeEstimate[]; recommended: Mode }

/** Road route from OSRM (OpenStreetMap routing, FOSSGIS servers); null when no road connects the points */
async function osrm(profile: 'foot' | 'bike' | 'car', a: [number, number], b: [number, number]): Promise<{ km: number; min: number } | null> {
  const url = `https://routing.openstreetmap.de/routed-${profile}/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=false&alternatives=false`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(9000), headers: { 'User-Agent': UA } });
    const d = (await r.json()) as { code?: string; routes?: { distance: number; duration: number }[] };
    const route = d.code === 'Ok' ? d.routes?.[0] : undefined;
    return route ? { km: route.distance / 1000, min: route.duration / 60 } : null;
  } catch {
    return null;
  }
}

/**
 * Distance and time by every mode. Walk/bike/car use real road routes; flight and ship are estimates
 * from the great-circle distance (cruise speed plus typical airport/port time).
 */
export async function getRoute(fromLat: number, fromLon: number, toLat: number, toLon: number): Promise<RouteResult> {
  const straight = haversineKm(fromLat, fromLon, toLat, toLon);
  const key = `route:v1:${fromLat.toFixed(4)},${fromLon.toFixed(4)}>${toLat.toFixed(4)},${toLon.toFixed(4)}`;
  const cached = env.mockExternal ? null : await store.cacheGet<RouteResult>(key);
  if (cached) return cached;
  const a: [number, number] = [fromLat, fromLon];
  const b: [number, number] = [toLat, toLon];

  // Only ask the road router for modes that make sense at this distance
  const [walk, bike, car] = env.mockExternal
    ? [straight < 40 ? { km: straight * 1.3, min: straight * 1.3 * 12 } : null, straight < 250 ? { km: straight * 1.25, min: straight * 1.25 * 4 } : null, straight < 2500 ? { km: straight * 1.3, min: straight * 1.3 * 1.25 } : null]
    : await Promise.all([
        straight < 40 ? osrm('foot', a, b) : Promise.resolve(null),
        straight < 250 ? osrm('bike', a, b) : Promise.resolve(null),
        straight < 3500 ? osrm('car', a, b) : Promise.resolve(null),
      ]);
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const modes: ModeEstimate[] = [
    walk && walk.km <= 40
      ? { mode: 'walk', available: true, distanceKm: r1(walk.km), minutes: Math.round(walk.min), source: 'road network', note: walk.km > 15 ? 'Long walk; plan rest stops' : 'Footpaths and roads' }
      : { mode: 'walk', available: false, distanceKm: r1(straight), minutes: 0, source: 'estimate', note: 'Too far to walk' },
    bike && bike.km <= 250
      ? { mode: 'bike', available: true, distanceKm: r1(bike.km), minutes: Math.round(bike.min), source: 'road network', note: 'Cycling route' }
      : { mode: 'bike', available: false, distanceKm: r1(straight), minutes: 0, source: 'estimate', note: 'Too far to cycle' },
    car
      ? { mode: 'car', available: true, distanceKm: r1(car.km), minutes: Math.round(car.min), source: 'road network', note: 'Fastest road route, without traffic' }
      : { mode: 'car', available: false, distanceKm: r1(straight), minutes: 0, source: 'estimate', note: straight >= 3500 ? 'Too far to drive' : 'No road connects these places' },
    straight >= 150
      ? { mode: 'flight', available: true, distanceKm: r1(straight), minutes: Math.round((straight / 800) * 60 + 120), source: 'estimate', note: 'Flying time at ~800 km/h plus about 2 h at airports; connections add more' }
      : { mode: 'flight', available: false, distanceKm: r1(straight), minutes: 0, source: 'estimate', note: 'Too close to fly' },
    !car && straight >= 20 && straight < 6000
      ? { mode: 'ship', available: true, distanceKm: r1(straight * 1.2), minutes: Math.round(((straight * 1.2) / 35) * 60 + 60), source: 'estimate', note: 'Ferry or ship at ~35 km/h, where a service exists' }
      : { mode: 'ship', available: false, distanceKm: r1(straight), minutes: 0, source: 'estimate', note: car ? 'Not needed: a road connects these places' : 'No sea route estimate' },
  ];
  const ok = (m: Mode) => modes.find((x) => x.mode === m)?.available;
  const recommended: Mode =
    straight <= 2 && ok('walk') ? 'walk' :
    straight <= 8 && ok('bike') ? 'bike' :
    ok('car') && (car!.min <= 8 * 60 || !ok('flight')) ? 'car' :
    ok('flight') ? 'flight' : ok('ship') ? 'ship' : 'car';
  const result = { straightKm: r1(straight), modes, recommended };
  if (!env.mockExternal) await store.cacheSet(key, result, 7 * 86_400);
  return result;
}

// ---------------- Real hotels (OpenStreetMap via Overpass) ----------------
export interface Hotel { name: string; kind: string; stars: string; distanceKm: number; lat: number; lon: number; website: string }

export async function getHotels(lat: number, lon: number): Promise<Hotel[]> {
  if (env.mockExternal) return [
    { name: 'Hotel Sample Residency', kind: 'hotel', stars: '3', distanceKm: 0.8, lat: lat + 0.005, lon: lon + 0.004, website: '' },
    { name: 'Riverside Guest House (sample)', kind: 'guest house', stars: '', distanceKm: 1.6, lat: lat - 0.01, lon: lon + 0.006, website: '' },
  ];
  const key = `hotels:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = await store.cacheGet<Hotel[]>(key);
  if (cached) return cached;
  const q = `[out:json][timeout:12];nwr["tourism"~"^(hotel|guest_house|hostel|motel)$"]["name"](around:6000,${lat},${lon});out center 60;`;
  try {
    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', body: new URLSearchParams({ data: q }), signal: AbortSignal.timeout(13_000), headers: { 'User-Agent': UA },
    });
    const d = (await r.json()) as { elements?: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
    const hotels = (d.elements ?? []).map((e) => {
      const p = e.center ?? { lat: e.lat ?? lat, lon: e.lon ?? lon };
      const t = e.tags ?? {};
      return { name: t['name:en'] || t.name || '', kind: (t.tourism ?? 'hotel').replace('_', ' '), stars: t.stars ?? '', distanceKm: Math.round(haversineKm(lat, lon, p.lat, p.lon) * 10) / 10, lat: p.lat, lon: p.lon, website: t.website ?? t['contact:website'] ?? '' };
    }).filter((h) => h.name).sort((a, b) => (Number(b.stars) || 0) - (Number(a.stars) || 0) || a.distanceKm - b.distanceKm).slice(0, 10);
    await store.cacheSet(key, hotels, 14 * 86_400);
    return hotels;
  } catch {
    return [];
  }
}

// ---------------- Featured destinations (home page cards with real photos) ----------------
const FEATURED = [
  { name: 'Varanasi', country: 'India', cc: 'IN', lat: 25.3176, lon: 82.9739, tag: 'Pilgrimage', wiki: 'Varanasi' },
  { name: 'Munnar', country: 'India', cc: 'IN', lat: 10.0889, lon: 77.0595, tag: 'Vacation', wiki: 'Munnar' },
  { name: 'Hampi', country: 'India', cc: 'IN', lat: 15.335, lon: 76.46, tag: 'Heritage', wiki: 'Hampi' },
  { name: 'Tirumala', country: 'India', cc: 'IN', lat: 13.6833, lon: 79.3474, tag: 'Pilgrimage', wiki: 'Tirumala_Venkateswara_Temple' },
  { name: 'Araku Valley', country: 'India', cc: 'IN', lat: 18.3273, lon: 82.8775, tag: 'Nature', wiki: 'Araku_Valley' },
  { name: 'Leh', country: 'India', cc: 'IN', lat: 34.1526, lon: 77.5771, tag: 'Adventure', wiki: 'Leh' },
  { name: 'Kyoto', country: 'Japan', cc: 'JP', lat: 35.0116, lon: 135.7681, tag: 'Culture', wiki: 'Kyoto' },
  { name: 'Lisbon', country: 'Portugal', cc: 'PT', lat: 38.7223, lon: -9.1393, tag: 'Vacation', wiki: 'Lisbon' },
];
export interface Featured { name: string; country: string; cc: string; lat: number; lon: number; tag: string; image: string | null; blurb: string }

export async function getFeatured(): Promise<Featured[]> {
  if (env.mockExternal) return FEATURED.map(({ wiki: _w, ...f }) => ({ ...f, image: null, blurb: 'Sample description' }));
  const cached = await store.cacheGet<Featured[]>('featured:v1');
  if (cached) return cached;
  const out = await Promise.all(FEATURED.map(async ({ wiki, ...f }) => {
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wiki}`, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': UA } });
      const d = (await r.json()) as { thumbnail?: { source: string }; originalimage?: { source: string }; description?: string };
      return { ...f, image: d.thumbnail?.source?.replace(/\/\d+px-/, '/640px-') ?? null, blurb: d.description ?? '' };
    } catch {
      return { ...f, image: null, blurb: '' };
    }
  }));
  await store.cacheSet('featured:v1', out, 7 * 86_400);
  return out;
}
