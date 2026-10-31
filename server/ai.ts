import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { DEMO, env } from './env.js';
import { HttpError } from './http.js';
import * as mock from './mock-data.js';
import { store, type UserDoc } from './store.js';

/**
 * AI features on Gemini. The key stays on the server; answers are forced into a JSON schema,
 * validated with Zod, cached in MongoDB, and limited per user per day to protect the free quota.
 */

const ai = env.geminiKey
  ? new GoogleGenAI({ apiKey: env.geminiKey, ...(env.geminiBaseUrl ? { httpOptions: { baseUrl: env.geminiBaseUrl } } : {}) })
  : null;

/**
 * Models to try, in order. Google retires model names over time, so if the configured one is gone
 * we fall back to the "latest Flash" alias and then older names, and remember whichever works.
 */
const MODELS = [...new Set([env.geminiModel, 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'].filter(Boolean))];
let workingModel: string | null = null;

type GenParams = Omit<Parameters<NonNullable<typeof ai>['models']['generateContent']>[0], 'model'>;

/** Turns a Gemini error into a message the user can act on (the raw error goes to the server log) */
function aiError(e: unknown): HttpError {
  const msg = String((e as Error)?.message ?? e);
  console.error('[orbit] Gemini error:', msg.slice(0, 500));
  if (/API_KEY_INVALID|API key not valid|invalid api key/i.test(msg)) return new HttpError(503, 'The AI key isn’t valid. The site owner needs to update GEMINI_API_KEY in Vercel.');
  if (/PERMISSION_DENIED|403/.test(msg)) return new HttpError(503, 'The AI key doesn’t have access to Gemini. The site owner needs to check the key in Google AI Studio.');
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) return new HttpError(503, 'The AI is busy right now (free quota reached). Try again in a minute.');
  if (/SAFETY|blocked/i.test(msg)) return new HttpError(422, 'The AI couldn’t answer that request. Try rephrasing it.');
  if (/not found|NOT_FOUND|404|not supported/i.test(msg)) return new HttpError(503, 'No available Gemini model was found for this key. The site owner needs to set GEMINI_MODEL in Vercel.');
  if (/timeout|aborted|ETIMEDOUT|fetch failed/i.test(msg)) return new HttpError(504, 'The AI took too long to answer. Try again.');
  return new HttpError(502, 'The AI service didn’t respond. Try again.');
}

/** Errors where a different model might work: unknown/retired/invalid model name, or an empty (thinking-only) reply */
const tryAnotherModel = (e: unknown) =>
  /not found|NOT_FOUND|404|is not supported|unsupported model|model.*(invalid|not valid)|invalid.*model|unexpected model|empty response/i.test(String((e as Error)?.message ?? e));

/** The raw error text, without anything that could be a key, for the owner's self-test */
const rawError = (e: unknown) => String((e as Error)?.message ?? e).replace(/AIza[0-9A-Za-z_-]{20,}/g, '[key]').slice(0, 400);

/** Calls Gemini with model fallback; returns the reply text */
async function callGemini(params: GenParams): Promise<{ text: string; model: string }> {
  if (!ai) throw new Error('no-ai');
  const order = workingModel ? [workingModel, ...MODELS.filter((m) => m !== workingModel)] : MODELS;
  let last: unknown = null;
  const tried: string[] = [];
  for (const model of order) {
    tried.push(model);
    try {
      const r = await ai.models.generateContent({ ...params, model });
      const text = (r.text ?? '').trim();
      if (!text) throw new Error(`empty response (finish reason: ${r.candidates?.[0]?.finishReason ?? 'unknown'})`);
      workingModel = model;
      return { text, model };
    } catch (e) {
      last = e;
      console.error(`[orbit] Gemini model ${model} failed:`, rawError(e));
      if (!tryAnotherModel(e)) break; // a real error (key, quota, safety): don't try other models
    }
  }
  const err = aiError(last);
  (err as HttpError & { detail?: string }).detail = `tried ${tried.join(', ')}: ${rawError(last)}`;
  throw err;
}

/** Used by /api/health?ai=1 so the owner can check the key and model in one click */
export async function aiSelfTest(): Promise<{ configured: boolean; ok: boolean; model: string | null; configuredModel: string | null; error: string | null; detail: string | null }> {
  const configuredModel = env.geminiModel || null;
  if (!ai) return { configured: false, ok: false, model: null, configuredModel, error: 'GEMINI_API_KEY is not set', detail: null };
  try {
    const r = await callGemini({ contents: 'Reply with the single word OK.', config: { maxOutputTokens: 1024 } });
    return { configured: true, ok: true, model: r.model, configuredModel, error: null, detail: null };
  } catch (e) {
    return { configured: true, ok: false, model: null, configuredModel, error: (e as Error).message, detail: (e as { detail?: string }).detail ?? rawError(e) };
  }
}

const today = () => new Date().toISOString().slice(0, 10);
const usageKey = (u: UserDoc) => `${u._id}:${today()}`;
const limitFor = (u: UserDoc) => (u.email === DEMO.email ? env.demoDailyLimit : env.aiDailyLimit);

export async function usage(u: UserDoc) {
  const used = await store.getUsage(usageKey(u));
  return { used, limit: limitFor(u), remaining: Math.max(0, limitFor(u) - used), aiEnabled: !!ai };
}

/** Refuses when today's allowance is used up (checked before calling the AI) */
async function checkAllowance(u: UserDoc): Promise<void> {
  if ((await store.getUsage(usageKey(u))) >= limitFor(u)) {
    throw new HttpError(429, `You’ve used today’s ${limitFor(u)} AI requests. They reset at midnight UTC; saved results still work.`);
  }
}
/** Counts a request, only after the AI actually answered */
const spendOne = (u: UserDoc) => store.incrementUsage(usageKey(u));

async function generate(prompt: string, schema: object, temperature = 0.4): Promise<unknown> {
  const { text } = await callGemini({
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      temperature, // low = steadier, more factual answers
      systemInstruction:
        'You are Orbit, a careful travel researcher. Give realistic, current-as-possible information. ' +
        'Costs are typical estimates in US dollars; never invent brand names, prices from specific websites, or offers. ' +
        'If you are unsure of a fact (for example an emergency number), say so in that field rather than guessing.',
    },
  });
  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    console.error('[orbit] AI returned non-JSON:', text.slice(0, 300));
    throw new HttpError(502, 'The AI returned an unreadable answer. Try again.');
  }
}

// ---------------- Destination scan ----------------
const money = z.number().nonnegative().max(1_000_000);
const scanSchema = z.object({
  summary: z.string().max(600),
  bestTimeToVisit: z.string().max(200),
  localCurrency: z.string().max(10),
  dailyCostUSD: z.object({ budget: money, moderate: money, luxury: money }),
  costBreakdownUSD: z.object({ stay: money, food: money, localTransport: money, activities: money }),
  gettingThere: z.array(z.object({ mode: z.string().max(30), typicalCostUSD: money, duration: z.string().max(60), note: z.string().max(160) })).max(6),
  laws: z.array(z.string().max(220)).max(6),
  customs: z.array(z.string().max(220)).max(6),
  emergency: z.object({ police: z.string().max(40), ambulance: z.string().max(40), fire: z.string().max(40), tourist: z.string().max(60) }),
  foods: z.array(z.object({ name: z.string().max(60), why: z.string().max(160) })).max(6),
  safetyTips: z.array(z.string().max(220)).max(5),
  confidence: z.string().max(160),
});
export type Scan = z.infer<typeof scanSchema>;

const str = { type: 'string' };
const num = { type: 'number' };
const scanJsonSchema = {
  type: 'object',
  properties: {
    summary: { ...str, description: '2-3 sentences: what the place is like for visitors' },
    bestTimeToVisit: str,
    localCurrency: { ...str, description: 'ISO 4217 code, e.g. JPY' },
    dailyCostUSD: { type: 'object', properties: { budget: num, moderate: num, luxury: num }, required: ['budget', 'moderate', 'luxury'] },
    costBreakdownUSD: { type: 'object', description: 'Typical moderate daily spend', properties: { stay: num, food: num, localTransport: num, activities: num }, required: ['stay', 'food', 'localTransport', 'activities'] },
    gettingThere: { type: 'array', items: { type: 'object', properties: { mode: str, typicalCostUSD: num, duration: str, note: str }, required: ['mode', 'typicalCostUSD', 'duration', 'note'] } },
    laws: { type: 'array', items: str, description: 'Laws visitors could unknowingly break' },
    customs: { type: 'array', items: str },
    emergency: { type: 'object', properties: { police: str, ambulance: str, fire: str, tourist: str }, required: ['police', 'ambulance', 'fire', 'tourist'] },
    foods: { type: 'array', items: { type: 'object', properties: { name: str, why: str }, required: ['name', 'why'] }, description: 'Healthy local dishes' },
    safetyTips: { type: 'array', items: str },
    confidence: { ...str, description: 'One sentence on how reliable these estimates are and what to double-check' },
  },
  required: ['summary', 'bestTimeToVisit', 'localCurrency', 'dailyCostUSD', 'costBreakdownUSD', 'gettingThere', 'laws', 'customs', 'emergency', 'foods', 'safetyTips', 'confidence'],
};

export const scanInput = z.object({
  name: z.string().trim().min(1).max(80),
  admin: z.string().trim().max(80).default(''),
  country: z.string().trim().min(1).max(80),
  countryCode: z.string().trim().max(3).default(''),
  from: z.string().trim().max(80).default(''),
});

export async function scanDestination(u: UserDoc, input: z.infer<typeof scanInput>): Promise<{ scan: Scan; cached: boolean; sample: boolean }> {
  if (!ai) return { scan: scanSchema.parse(mock.scan(input.name, input.country)), cached: false, sample: true };
  const key = `scan:v1:${[input.name, input.admin, input.country, input.from].join('|').toLowerCase()}`;
  const hit = await store.cacheGet<Scan>(key);
  if (hit) return { scan: hit, cached: true, sample: false };

  await checkAllowance(u);
  const place = [input.name, input.admin, input.country].filter(Boolean).join(', ');
  const raw = await generate(
    `Destination: ${place}.` + (input.from ? ` The traveller is coming from ${input.from}; "gettingThere" should cover realistic options from there.` : ' "gettingThere" should cover typical ways visitors arrive.') +
      ' Give a visitor briefing: typical daily costs at three comfort levels, a breakdown of a moderate day, ways to get there, laws a visitor could unknowingly break, local customs, emergency numbers, healthy local food, and safety tips.',
    scanJsonSchema);
  const parsed = scanSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(502, 'The AI answer was incomplete. Try again.');
  await spendOne(u);
  await store.cacheSet(key, parsed.data, 7 * 86_400); // shared by everyone who scans this place this week
  return { scan: parsed.data, cached: false, sample: false };
}

// ---------------- Budget planner ----------------
const budgetSchema = z.object({
  tiers: z.array(z.object({
    tier: z.enum(['cheap', 'moderate', 'expensive']),
    destinations: z.array(z.object({
      name: z.string().max(80), country: z.string().max(80), lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180),
      estimatedTotalUSD: money, perDayUSD: money, why: z.string().max(240), bestFor: z.string().max(80),
    })).max(4),
  })).length(3),
});
export type Budget = z.infer<typeof budgetSchema>;

const budgetJsonSchema = {
  type: 'object',
  properties: {
    tiers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tier: { type: 'string', enum: ['cheap', 'moderate', 'expensive'] },
          destinations: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: str, country: str, lat: num, lon: num, estimatedTotalUSD: { ...num, description: 'Whole trip incl. travel from the origin' }, perDayUSD: num, why: str, bestFor: str },
              required: ['name', 'country', 'lat', 'lon', 'estimatedTotalUSD', 'perDayUSD', 'why', 'bestFor'],
            },
          },
        },
        required: ['tier', 'destinations'],
      },
    },
  },
  required: ['tiers'],
};

export const budgetInput = z.object({
  amount: z.number().positive().max(100_000_000),
  currency: z.string().trim().length(3).toUpperCase(),
  amountUSD: z.number().positive().max(10_000_000),
  from: z.string().trim().min(1).max(80),
  days: z.number().int().min(1).max(60),
  travellers: z.number().int().min(1).max(12),
  interests: z.string().trim().max(120).default(''),
  month: z.string().trim().max(20).default(''),
});

export async function planBudget(u: UserDoc, input: z.infer<typeof budgetInput>): Promise<{ plan: Budget; cached: boolean; sample: boolean }> {
  if (!ai) return { plan: budgetSchema.parse(mock.budget(input.amountUSD)), cached: false, sample: true };
  const bucket = Math.round(input.amountUSD / 50) * 50; // similar budgets share a cached answer
  const key = `budget:v1:${[input.from, bucket, input.days, input.travellers, input.interests, input.month].join('|').toLowerCase()}`;
  const hit = await store.cacheGet<Budget>(key);
  if (hit) return { plan: hit, cached: true, sample: false };

  await checkAllowance(u);
  const raw = await generate(
    `A group of ${input.travellers} travelling from ${input.from} for ${input.days} days` +
      (input.month ? ` in ${input.month}` : '') + ` has a total budget of about ${Math.round(input.amountUSD)} US dollars` +
      (input.interests ? `, interested in: ${input.interests}` : '') + '. ' +
      'Suggest 3 destinations in each tier: "cheap" (comfortably under budget), "moderate" (close to budget) and "expensive" (a stretch, slightly over). ' +
      'Prefer places reachable from the origin. Include accurate latitude/longitude for each destination and realistic whole-trip totals.',
    budgetJsonSchema);
  const parsed = budgetSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(502, 'The AI answer was incomplete. Try again.');
  await spendOne(u);
  await store.cacheSet(key, parsed.data, 3 * 86_400);
  return { plan: parsed.data, cached: false, sample: false };
}

// ---------------- Trip planner ----------------
export const PURPOSES = ['Pilgrimage', 'Vacation', 'Work', 'Family', 'Adventure', 'Other'] as const;

const tripPlanSchema = z.object({
  summary: z.string().max(500),
  getThere: z.object({ mode: z.string().max(30), route: z.string().max(240), costUSD: money, duration: z.string().max(60), tip: z.string().max(200) }),
  getBack: z.object({ mode: z.string().max(30), route: z.string().max(240), costUSD: money, duration: z.string().max(60), tip: z.string().max(200) }),
  stay: z.object({ area: z.string().max(160), perNightUSD: money, picks: z.array(z.object({ name: z.string().max(100), why: z.string().max(160) })).max(4) }),
  food: z.array(z.object({ name: z.string().max(60), where: z.string().max(120), approxUSD: money })).max(6),
  days: z.array(z.object({ day: z.number().int().min(1).max(60), title: z.string().max(80), items: z.array(z.string().max(200)).max(6) })).max(30),
  budgetUSD: z.object({ travel: money, stay: money, food: money, local: money, activities: money, buffer: money }),
  typicalTotalUSD: money,
  packing: z.array(z.string().max(120)).max(8),
  goodToKnow: z.array(z.string().max(200)).max(6),
});
export type TripPlan = z.infer<typeof tripPlanSchema>;

const leg = { type: 'object', properties: { mode: str, route: str, costUSD: num, duration: str, tip: str }, required: ['mode', 'route', 'costUSD', 'duration', 'tip'] };
const tripPlanJsonSchema = {
  type: 'object',
  properties: {
    summary: str,
    getThere: leg,
    getBack: leg,
    stay: { type: 'object', properties: { area: str, perNightUSD: num, picks: { type: 'array', items: { type: 'object', properties: { name: str, why: str }, required: ['name', 'why'] } } }, required: ['area', 'perNightUSD', 'picks'] },
    food: { type: 'array', items: { type: 'object', properties: { name: str, where: str, approxUSD: num }, required: ['name', 'where', 'approxUSD'] } },
    days: { type: 'array', items: { type: 'object', properties: { day: { type: 'integer' }, title: str, items: { type: 'array', items: str } }, required: ['day', 'title', 'items'] } },
    budgetUSD: { type: 'object', description: 'Total for the whole group and trip', properties: { travel: num, stay: num, food: num, local: num, activities: num, buffer: num }, required: ['travel', 'stay', 'food', 'local', 'activities', 'buffer'] },
    typicalTotalUSD: { ...num, description: 'What a typical unplanned group spends on the same trip (booking late, tourist prices)' },
    packing: { type: 'array', items: str },
    goodToKnow: { type: 'array', items: str },
  },
  required: ['summary', 'getThere', 'getBack', 'stay', 'food', 'days', 'budgetUSD', 'typicalTotalUSD', 'packing', 'goodToKnow'],
};

export const planInput = z.object({
  purpose: z.enum(PURPOSES),
  destination: z.object({ name: z.string().trim().min(1).max(80), country: z.string().trim().max(80).default(''), countryCode: z.string().trim().max(3).default(''), lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
  origin: z.object({ name: z.string().trim().min(1).max(120), lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  travellers: z.number().int().min(1).max(12),
  budgetUSD: z.number().nonnegative().max(10_000_000).default(0),
  notes: z.string().trim().max(200).default(''),
});

export async function draftPlan(u: UserDoc, input: z.infer<typeof planInput>, context: { route: string; hotels: string }): Promise<{ plan: TripPlan; sample: boolean }> {
  const days = Math.round((Date.parse(input.endDate) - Date.parse(input.startDate)) / 86_400_000) + 1;
  if (!(days >= 1 && days <= 30)) throw new HttpError(400, 'Trips can be 1 to 30 days; check the dates.');
  if (!ai) return { plan: tripPlanSchema.parse(mock.tripPlan(input.destination.name, days)), sample: true };
  await checkAllowance(u);
  const raw = await generate(
    `Plan a ${input.purpose.toLowerCase()} trip for ${input.travellers} traveller(s) from ${input.origin.name} to ${input.destination.name}, ${input.destination.country}, ` +
      `${input.startDate} to ${input.endDate} (${days} days).` +
      (input.budgetUSD > 0 ? ` Their total budget is about ${Math.round(input.budgetUSD)} USD; keep the plan within it if realistic, and say so in the summary if not.` : '') +
      (input.notes ? ` Notes from the traveller: ${input.notes}.` : '') +
      `\nMeasured travel options between origin and destination: ${context.route}.` +
      `\nReal places to stay near the destination (from OpenStreetMap): ${context.hotels || 'none found; recommend an area instead'}. ` +
      'For "stay.picks", ONLY choose from this list of real places, never invent hotel names. ' +
      (input.purpose === 'Pilgrimage' ? 'Include darshan/visiting timings advice, dress codes and queue tips in goodToKnow. ' : '') +
      (input.purpose === 'Work' ? 'Keep evenings free and suggest stays close to business districts. ' : '') +
      `Give one "days" entry per day (${days} days), costs for the whole group in USD, and a realistic typicalTotalUSD for an unplanned trip.`,
    tripPlanJsonSchema, 0.5);
  const parsed = tripPlanSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[orbit] plan schema mismatch:', parsed.error.issues.slice(0, 3));
    throw new HttpError(502, 'The AI plan was incomplete. Try again.');
  }
  await spendOne(u);
  return { plan: parsed.data, sample: false };
}

// ---------------- Bine: multilingual travel assistant ----------------
export const chatInput = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'model']), text: z.string().trim().min(1).max(1200) })).min(1).max(16),
  language: z.string().trim().max(40).default('English'),
  place: z.string().trim().max(160).default(''),
});

/** What Bine knows about the signed-in user, so it can answer about their own trips and places */
export interface BineContext { currency: string; upcoming: string[]; past: string[]; saved: string[]; today: string }

export async function askBine(u: UserDoc, input: z.infer<typeof chatInput>, ctx: BineContext): Promise<{ reply: string; sample: boolean }> {
  if (!ai) return { reply: `(Sample) I am Bine. Add a Gemini key and I will answer in ${input.language}.`, sample: true };
  await checkAllowance(u);
  // Gemini needs the conversation to start with the user and alternate roles
  const turns = input.messages.slice(input.messages.findIndex((m) => m.role === 'user'));
  const { text } = await callGemini({
    contents: turns.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    config: {
      temperature: 0.6,
      maxOutputTokens: 1024,
        systemInstruction:
          `You are Bine, the friendly assistant inside the Orbit travel app. Reply in the same language the user writes in; if unsure, use ${input.language}. ` +
          'Your reply will be read aloud, so use short plain sentences, no markdown, no lists longer than 4 items, at most about 120 words. ' +
          'You can help with anything the user asks: travel, places, routes, budgets, culture, safety, weather and trip planning, and also general questions. ' +
          'For prices, give estimates and say so. Be honest when you are unsure, and do not make up facts. ' +
          'Orbit features you can point the user to: Explore (globe, street map, famous places, travel times by walk/bike/car/flight/ship), Plan a trip, Budget planner, My trips, Settings. ' +
          `\nAbout this user: name ${u.name}; preferred currency ${ctx.currency}; today is ${ctx.today}. ` +
          `Upcoming trips: ${ctx.upcoming.join('; ') || 'none'}. Past trips: ${ctx.past.join('; ') || 'none'}. Saved places: ${ctx.saved.join(', ') || 'none'}. ` +
          (input.place ? `They are currently looking at: ${input.place}.` : ''),
    },
  });
  await spendOne(u);
  return { reply: text.slice(0, 1500), sample: false };
}
