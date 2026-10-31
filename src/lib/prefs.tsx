import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** Settings anyone can change, saved in this browser */
export interface Prefs {
  theme: 'system' | 'dark' | 'light';
  temperature: 'C' | 'F';
  distance: 'km' | 'mi';
  mapStyle: 'map' | 'satellite';
  bineVoice: boolean;
  bineLang: string; // '' = match the browser language
  reduceMotion: boolean;
}

const DEFAULTS: Prefs = { theme: 'system', temperature: 'C', distance: 'km', mapStyle: 'map', bineVoice: true, bineLang: '', reduceMotion: false };
const KEY = 'orbit-prefs';

function load(): Prefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

interface PrefsCtx {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  reset: () => void;
  /** Formatting in the chosen units */
  dist: (km: number) => string;
  temp: (c: number) => string;
  speed: (kmh: number) => string;
}

const Ctx = createContext<PrefsCtx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode: keep in memory */ }
  }, [prefs]);

  // Theme: follow the system setting, or force dark/light
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const light = prefs.theme === 'light' || (prefs.theme === 'system' && mq.matches);
      document.documentElement.dataset.theme = light ? 'light' : 'dark';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#eef2ff' : '#070b1a');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [prefs.theme]);

  useEffect(() => {
    document.documentElement.dataset.motion = prefs.reduceMotion ? 'reduce' : 'full';
  }, [prefs.reduceMotion]);

  const mi = prefs.distance === 'mi';
  const dist = (km: number) => {
    const v = mi ? km * 0.621371 : km;
    const digits = v < 10 ? 1 : 0;
    return `${v.toLocaleString(undefined, { maximumFractionDigits: digits })} ${mi ? 'mi' : 'km'}`;
  };
  const temp = (c: number) => `${Math.round(prefs.temperature === 'F' ? c * 1.8 + 32 : c)}°`;
  const speed = (kmh: number) => (mi ? `${Math.round(kmh * 0.621371)} mph` : `${Math.round(kmh)} km/h`);

  return (
    <Ctx.Provider value={{ prefs, setPref: (k, v) => setPrefs((p) => ({ ...p, [k]: v })), reset: () => setPrefs(DEFAULTS), dist, temp, speed }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePrefs(): PrefsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePrefs outside PrefsProvider');
  return c;
}
