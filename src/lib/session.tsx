import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, type Usage, type User } from './api';

export interface LatLon { lat: number; lon: number }

interface Session {
  user: User | null;
  usage: Usage | null;
  loading: boolean;
  rates: Record<string, number> | null;
  currency: string;
  setUser: (u: User | null) => void;
  setUsage: (u: Usage) => void;
  refresh: () => Promise<void>;
  setCurrency: (c: string) => void;
  money: (usd: number) => string;
  toUSD: (amount: number, currency?: string) => number | null;
  fromUSD: (usd: number) => number;
  /** Opens the sign-in dialog if needed; runs `then` once signed in. Returns true if already signed in. */
  requireLogin: (reason: string, then?: () => void) => boolean;
  loginPrompt: { reason: string; then?: () => void } | null;
  closeLogin: () => void;
  /** The visitor's location, once they allow it */
  myLocation: LatLon | null;
  locate: () => Promise<LatLon>;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestCurrency, setGuestCurrency] = useState('INR');
  const [loginPrompt, setLoginPrompt] = useState<Session['loginPrompt']>(null);
  const [myLocation, setMyLocation] = useState<LatLon | null>(null);
  // Always the current user, even inside callbacks created before logging in
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: User; usage: Usage }>('auth/me');
      userRef.current = r.user;
      setUserState(r.user);
      setUsage(r.usage);
    } catch {
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void refresh(), [refresh]);
  useEffect(() => {
    api<{ rates: Record<string, number> }>('rates').then((r) => setRates(r.rates)).catch(() => {});
  }, []);

  const setUser = (u: User | null) => {
    userRef.current = u;
    setUserState(u);
    if (u && loginPrompt) {
      const then = loginPrompt.then;
      setLoginPrompt(null);
      // Continue what the visitor was doing, once React has applied the login
      if (then) setTimeout(then, 0);
    }
  };

  const currency = user?.currency ?? guestCurrency;
  const setCurrency = (c: string) => {
    if (user) {
      setUserState({ ...user, currency: c });
      void api('me/currency', { method: 'PUT', body: { currency: c } }).catch(() => {});
    } else setGuestCurrency(c);
  };

  const money = (usd: number) => {
    const rate = rates?.[currency];
    const [value, code] = rate ? [usd * rate, currency] : [usd, 'USD'];
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(value);
    } catch {
      return `${code} ${Math.round(value).toLocaleString()}`;
    }
  };
  const toUSD = (amount: number, cur = currency) => (rates?.[cur] ? amount / rates[cur]! : null);
  const fromUSD = (usd: number) => usd * (rates?.[currency] ?? 1);

  const requireLogin = (reason: string, then?: () => void) => {
    if (userRef.current) return true;
    setLoginPrompt({ reason, then });
    return false;
  };

  const locate = () =>
    new Promise<LatLon>((resolve, reject) => {
      if (myLocation) return resolve(myLocation);
      if (!navigator.geolocation) return reject(new Error('Your browser can’t share your location.'));
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const loc = { lat: p.coords.latitude, lon: p.coords.longitude };
          setMyLocation(loc);
          resolve(loc);
        },
        (e) => reject(new Error(e.code === 1 ? 'Location permission was denied. You can allow it in your browser’s site settings.' : 'Couldn’t get your location. Try again.')),
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 300_000 },
      );
    });

  return (
    <Ctx.Provider value={{ user, usage, loading, rates, currency, setUser, setUsage, refresh, setCurrency, money, toUSD, fromUSD,
      requireLogin, loginPrompt, closeLogin: () => setLoginPrompt(null), myLocation, locate }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession(): Session {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSession outside SessionProvider');
  return c;
}

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'AUD', 'CAD', 'THB', 'LKR', 'NPR', 'MYR', 'IDR', 'CHF', 'CNY', 'KRW', 'SAR'];
