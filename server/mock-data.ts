/** Sample data for offline local testing (MOCK_EXTERNAL=1). Never used in production. */
import { deflateSync } from 'node:zlib';

export const places = [
  { id: 1, name: 'Kyoto', admin: 'Kyoto', country: 'Japan', countryCode: 'JP', lat: 35.0116, lon: 135.7681, timezone: 'Asia/Tokyo', population: 1459640 },
  { id: 2, name: 'Munnar', admin: 'Kerala', country: 'India', countryCode: 'IN', lat: 10.0889, lon: 77.0595, timezone: 'Asia/Kolkata', population: 38471 },
  { id: 3, name: 'Lisbon', admin: 'Lisbon', country: 'Portugal', countryCode: 'PT', lat: 38.7167, lon: -9.1333, timezone: 'Europe/Lisbon', population: 517802 },
  { id: 4, name: 'Hyderabad', admin: 'Telangana', country: 'India', countryCode: 'IN', lat: 17.385, lon: 78.4867, timezone: 'Asia/Kolkata', population: 6809970 },
];

const today = new Date();
export const weather = {
  timezone: 'Asia/Tokyo',
  current: { temperature: 17.4, feelsLike: 16.1, humidity: 64, windSpeed: 9.4, precipitation: 0, code: 2, isDay: true, time: today.toISOString().slice(0, 16) },
  daily: Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    return { date: d, code: [2, 3, 61, 1, 0, 45, 80][i] ?? 0, max: 19 + (i % 3), min: 11 + (i % 2), rainChance: [10, 25, 70, 5, 0, 15, 55][i] ?? 0, sunrise: `${d}T06:02`, sunset: `${d}T17:05` };
  }),
};

export const rates = { base: 'USD' as const, updated: today.toUTCString(), rates: { USD: 1, INR: 83.2, EUR: 0.92, GBP: 0.79, JPY: 151.4, AED: 3.67, SGD: 1.35, THB: 36.1, AUD: 1.52 } };

/** A tiny blue/green equirectangular PNG so the globe renders offline */
export function satelliteJpeg(): Buffer {
  const w = 64, h = 32;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const land = Math.sin(x / 6) * Math.cos(y / 4) > 0.35;
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = land ? 60 : 12; raw[o + 1] = land ? 110 : 52; raw[o + 2] = land ? 60 : 110;
    }
  }
  const crc = (buf: Buffer) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

export const scan = (name: string, country: string) => ({
  summary: `${name} is a sample answer: add a GEMINI_API_KEY to get real AI-generated guidance for ${country}.`,
  bestTimeToVisit: 'October to April (sample)',
  localCurrency: 'JPY',
  dailyCostUSD: { budget: 45, moderate: 110, luxury: 320 },
  costBreakdownUSD: { stay: 60, food: 25, localTransport: 8, activities: 17 },
  gettingThere: [
    { mode: 'Flight', typicalCostUSD: 420, duration: '8–10 h with one stop', note: 'Sample estimate' },
    { mode: 'Train', typicalCostUSD: 0, duration: 'Not practical', note: 'Not available from most cities' },
  ],
  laws: ['Carry your passport at all times (sample).', 'Some cold medicines are restricted (sample).'],
  customs: ['Remove shoes when entering homes and temples (sample).'],
  emergency: { police: '110', ambulance: '119', fire: '119', tourist: '' },
  foods: [{ name: 'Yudofu', why: 'Light, protein-rich simmered tofu (sample)' }, { name: 'Obanzai', why: 'Seasonal vegetable home cooking (sample)' }],
  safetyTips: ['Very safe overall; watch for bicycles on pavements (sample).'],
  confidence: 'Sample data',
});

export const budget = (amountUsd: number) => ({
  tiers: (['cheap', 'moderate', 'expensive'] as const).map((tier, i) => ({
    tier,
    destinations: [
      { name: ['Hampi', 'Lisbon', 'Kyoto'][i]!, country: ['India', 'Portugal', 'Japan'][i]!, lat: [15.335, 38.7167, 35.0116][i]!, lon: [76.46, -9.1333, 135.7681][i]!,
        estimatedTotalUSD: Math.round(amountUsd * [0.5, 0.85, 1.15][i]!), perDayUSD: [30, 95, 160][i]!, why: 'Sample suggestion: add a GEMINI_API_KEY for real ones.', bestFor: ['History', 'Food and culture', 'Temples and gardens'][i]! },
    ],
  })),
});
