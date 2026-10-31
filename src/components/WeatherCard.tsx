import { useEffect, useState } from 'react';
import { api, type Weather } from '../lib/api';
import { clock, dayName, describe } from '../lib/weather';
import { WeatherIcon } from './WeatherIcon';
import { usePrefs } from '../lib/prefs';

/** Live conditions and 7-day forecast for a coordinate */
export function WeatherCard({ lat, lon }: { lat: number; lon: number }) {
  const { temp, speed, prefs } = usePrefs();
  const [w, setW] = useState<Weather | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setW(null);
    setError('');
    api<{ weather: Weather }>(`weather?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`)
      .then((r) => setW(r.weather))
      .catch((e: Error) => setError(e.message));
  }, [lat, lon]);

  if (error) return <p className="muted">{error}</p>;
  if (!w) return <div className="skeleton" style={{ height: 180 }} aria-label="Loading weather" />;

  const now = describe(w.current.code);
  return (
    <div className="weather">
      <div className="weather__now">
        <WeatherIcon sky={now.sky} night={!w.current.isDay} size={56} />
        <div>
          <p className="weather__temp">{temp(w.current.temperature)}<span>{prefs.temperature}</span></p>
          <p className="muted">{now.label} · feels like {temp(w.current.feelsLike)}</p>
        </div>
      </div>
      <dl className="stats">
        <div><dt>Humidity</dt><dd>{w.current.humidity}%</dd></div>
        <div><dt>Wind</dt><dd>{speed(w.current.windSpeed)}</dd></div>
        <div><dt>Sunrise</dt><dd>{clock(w.daily[0]?.sunrise ?? '')}</dd></div>
        <div><dt>Sunset</dt><dd>{clock(w.daily[0]?.sunset ?? '')}</dd></div>
      </dl>
      <ol className="forecast" aria-label="7-day forecast">
        {w.daily.map((d, i) => {
          const s = describe(d.code);
          return (
            <li key={d.date} title={s.label}>
              <span className="forecast__day">{dayName(d.date, i)}</span>
              <WeatherIcon sky={s.sky} size={26} />
              <span className="forecast__temp">{temp(d.max)} <em>{temp(d.min)}</em></span>
              <span className="forecast__rain">{d.rainChance}%</span>
            </li>
          );
        })}
      </ol>
      <p className="fineprint">Local time {clock(w.current.time)} ({w.timezone}). Data: Open-Meteo, from national weather services.</p>
    </div>
  );
}
