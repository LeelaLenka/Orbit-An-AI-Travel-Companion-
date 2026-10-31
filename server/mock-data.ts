/** Sample data for offline local testing (MOCK_EXTERNAL=1). Never used in production. */
import { deflateSync } from 'node:zlib';

export const places = [
  { id: 'R1', name: 'Kyoto', detail: 'Kyoto Prefecture, Japan', kind: 'city', precise: false, admin: 'Kyoto', country: 'Japan', countryCode: 'JP', lat: 35.0116, lon: 135.7681 },
  { id: 'N2', name: 'Kinkaku-ji', detail: 'Kita Ward, Kyoto, Kyoto Prefecture, 603-8361, Japan', kind: 'landmark', precise: true, admin: 'Kyoto Prefecture', country: 'Japan', countryCode: 'JP', lat: 35.0394, lon: 135.7292 },
  { id: 'R3', name: 'Vizianagaram', detail: 'Andhra Pradesh, India', kind: 'city', precise: false, admin: 'Andhra Pradesh', country: 'India', countryCode: 'IN', lat: 18.1169, lon: 83.4115 },
  { id: 'W4', name: 'Vizianagaram Fort', detail: 'Fort Road, Vizianagaram, Andhra Pradesh, 535002, India', kind: 'landmark', precise: true, admin: 'Andhra Pradesh', country: 'India', countryCode: 'IN', lat: 18.1135, lon: 83.4019 },
  { id: 'N5', name: '12 MG Road', detail: 'Labbipet, Vijayawada, Andhra Pradesh, 520010, India', kind: 'house', precise: true, admin: 'Andhra Pradesh', country: 'India', countryCode: 'IN', lat: 16.5062, lon: 80.648 },
];

export function placeInfo(lat: number, lon: number, name: string) {
  const near = (dLat: number, dLon: number) => ({ lat: lat + dLat, lon: lon + dLon });
  return {
    about: { title: name, extract: `${name} is a sample description. On the live site this comes from Wikipedia: history, what it is known for and why people visit.`, image: null, url: 'https://en.wikipedia.org' },
    country: { name: 'Japan', capital: 'Tokyo', region: 'Eastern Asia', currencies: [{ code: 'JPY', name: 'Japanese yen', symbol: '¥' }], languages: ['Japanese'], callingCode: '+81', drivingSide: 'left', timezones: ['UTC+09:00'], flag: '' },
    attractions: [
      { title: 'Kiyomizu-dera', description: 'Buddhist temple in Kyoto, Japan', extract: 'A wooden temple famous for its veranda over the hillside (sample).', image: null, ...near(-0.016, 0.017), distanceKm: 2.4, url: 'https://en.wikipedia.org', views: 54000 },
      { title: 'Fushimi Inari-taisha', description: 'Shinto shrine in Kyoto', extract: 'Known for thousands of vermilion torii gates (sample).', image: null, ...near(-0.044, 0.004), distanceKm: 4.9, url: 'https://en.wikipedia.org', views: 61000 },
      { title: 'Nishiki Market', description: 'Market street in Kyoto', extract: 'A narrow covered food market (sample).', image: null, ...near(-0.006, -0.003), distanceKm: 0.7, url: 'https://en.wikipedia.org', views: 9000 },
    ],
  };
}

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

export const tripPlan = (dest: string, days: number) => ({
  summary: `Sample plan for ${dest}. Add a GEMINI_API_KEY for a real AI plan.`,
  getThere: { mode: 'Train', route: 'Sample: overnight express to the nearest station', costUSD: 18, duration: '9 h', tip: 'Book 2–3 weeks ahead (sample)' },
  getBack: { mode: 'Bus', route: 'Sample: state transport sleeper bus', costUSD: 14, duration: '10 h', tip: 'Leave early to avoid traffic (sample)' },
  stay: { area: 'Near the old town (sample)', perNightUSD: 30, picks: [{ name: 'Hotel Sample Residency', why: 'Well rated and central (sample)' }] },
  food: [{ name: 'Local thali', where: 'Family restaurants near the market', approxUSD: 3 }],
  days: Array.from({ length: days }, (_, i) => ({ day: i + 1, title: `Day ${i + 1} (sample)`, items: ['Morning visit', 'Lunch locally', 'Evening walk'] })),
  budgetUSD: { travel: 32, stay: 30 * Math.max(1, days - 1), food: 12 * days, local: 6 * days, activities: 10 * days, buffer: 20 },
  typicalTotalUSD: Math.round((32 + 45 * Math.max(1, days - 1) + 20 * days + 10 * days + 15 * days + 20) ),
  packing: ['Comfortable shoes (sample)'],
  goodToKnow: ['Carry some cash (sample)'],
});
