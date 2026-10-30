import { env } from './env.js';
import { HttpError } from './http.js';
import { store } from './store.js';
import * as mock from './mock-data.js';

/** Live data from free, keyless public services */

async function fetchJson<T>(url: string, what: string): Promise<T> {
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'Orbit travel app' } });
  if (!r.ok) throw new HttpError(502, `${what} is unavailable right now. Try again shortly.`);
  return (await r.json()) as T;
}

export interface Place {
  id: number; name: string; admin: string; country: string; countryCode: string;
  lat: number; lon: number; timezone: string; population: number;
}

/** Place search (Open-Meteo geocoding, based on GeoNames) */
export async function searchPlaces(q: string): Promise<Place[]> {
  if (env.mockExternal) return mock.places.filter((p) => p.name.toLowerCase().startsWith(q.toLowerCase().slice(0, 3)));
  type R = { results?: { id: number; name: string; admin1?: string; country?: string; country_code?: string; latitude: number; longitude: number; timezone?: string; population?: number }[] };
  const data = await fetchJson<R>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`, 'Place search');
  return (data.results ?? []).map((p) => ({
    id: p.id, name: p.name, admin: p.admin1 ?? '', country: p.country ?? '', countryCode: p.country_code ?? '',
    lat: p.latitude, lon: p.longitude, timezone: p.timezone ?? 'UTC', population: p.population ?? 0,
  }));
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
