import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type Usage, type User } from './api';

interface Session {
  user: User | null;
  usage: Usage | null;
  loading: boolean;
  rates: Record<string, number> | null;
  setUser: (u: User | null) => void;
  setUsage: (u: Usage) => void;
  refresh: () => Promise<void>;
  setCurrency: (c: string) => void;
  /** Converts US dollars to the user's currency and formats it, e.g. "₹8,320" */
  money: (usd: number) => string;
  toUSD: (amount: number, currency: string) => number | null;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: User; usage: Usage }>('auth/me');
      setUser(r.user);
      setUsage(r.usage);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void refresh(), [refresh]);
  useEffect(() => {
    if (user && !rates) api<{ rates: Record<string, number> }>('rates').then((r) => setRates(r.rates)).catch(() => {});
  }, [user, rates]);

  const setCurrency = (c: string) => {
    if (!user) return;
    setUser({ ...user, currency: c });
    void api('me/currency', { method: 'PUT', body: { currency: c } }).catch(() => {});
  };

  const money = (usd: number) => {
    const cur = user?.currency ?? 'USD';
    const rate = rates?.[cur];
    const [value, code] = rate ? [usd * rate, cur] : [usd, 'USD'];
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(value);
    } catch {
      return `${code} ${Math.round(value).toLocaleString()}`;
    }
  };

  const toUSD = (amount: number, currency: string) => {
    const rate = rates?.[currency];
    return rate ? amount / rate : null;
  };

  return (
    <Ctx.Provider value={{ user, usage, loading, rates, setUser, setUsage, refresh, setCurrency, money, toUSD }}>
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
