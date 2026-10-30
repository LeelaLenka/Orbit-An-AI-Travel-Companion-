export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** JSON fetch to our own /api (the session cookie is sent automatically) */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'You appear to be offline. Check your connection and try again.');
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data;
}

export interface User { id: string; name: string; email: string; currency: string; demo: boolean }
export interface Usage { used: number; limit: number; remaining: number; aiEnabled: boolean }
export interface Place { id: number; name: string; admin: string; country: string; countryCode: string; lat: number; lon: number; timezone: string; population: number }
export interface Trip { _id: string; name: string; country: string; countryCode: string; lat: number; lon: number; note: string; createdAt: string }
export interface Weather {
  timezone: string;
  current: { temperature: number; feelsLike: number; humidity: number; windSpeed: number; precipitation: number; code: number; isDay: boolean; time: string };
  daily: { date: string; code: number; max: number; min: number; rainChance: number; sunrise: string; sunset: string }[];
}
export interface Scan {
  summary: string; bestTimeToVisit: string; localCurrency: string;
  dailyCostUSD: { budget: number; moderate: number; luxury: number };
  costBreakdownUSD: { stay: number; food: number; localTransport: number; activities: number };
  gettingThere: { mode: string; typicalCostUSD: number; duration: string; note: string }[];
  laws: string[]; customs: string[];
  emergency: { police: string; ambulance: string; fire: string; tourist: string };
  foods: { name: string; why: string }[]; safetyTips: string[]; confidence: string;
}
export interface BudgetPlan {
  tiers: { tier: 'cheap' | 'moderate' | 'expensive'; destinations: { name: string; country: string; lat: number; lon: number; estimatedTotalUSD: number; perDayUSD: number; why: string; bestFor: string }[] }[];
}
