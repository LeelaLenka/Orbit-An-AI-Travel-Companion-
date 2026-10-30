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

const ai = env.geminiKey ? new GoogleGenAI({ apiKey: env.geminiKey }) : null;

const today = () => new Date().toISOString().slice(0, 10);
const usageKey = (u: UserDoc) => `${u._id}:${today()}`;
const limitFor = (u: UserDoc) => (u.email === DEMO.email ? env.demoDailyLimit : env.aiDailyLimit);

export async function usage(u: UserDoc) {
  const used = await store.getUsage(usageKey(u));
  return { used, limit: limitFor(u), remaining: Math.max(0, limitFor(u) - used), aiEnabled: !!ai };
}

async function spendOne(u: UserDoc): Promise<void> {
  const n = await store.incrementUsage(usageKey(u));
  if (n > limitFor(u)) {
    throw new HttpError(429, `You’ve used today’s ${limitFor(u)} AI requests. They reset at midnight UTC; saved results still work.`);
  }
}

async function generate(prompt: string, schema: object): Promise<unknown> {
  if (!ai) throw new Error('no-ai');
  let text: string | undefined;
  try {
    const r = await ai.models.generateContent({
      model: env.geminiModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
        temperature: 0.4, // steadier, more factual answers
        systemInstruction:
          'You are Orbit, a careful travel researcher. Give realistic, current-as-possible information. ' +
          'Costs are typical estimates in US dollars for one traveller; never invent brand names, prices from specific websites, or offers. ' +
          'If you are unsure of a fact (for example an emergency number), say so in that field rather than guessing.',
      },
    });
    text = r.text;
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) throw new HttpError(503, 'The AI service is busy (free quota reached). Try again in a minute.');
    throw new HttpError(502, 'The AI service didn’t respond. Try again.');
  }
  try {
    return JSON.parse(text ?? '');
  } catch {
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

  await spendOne(u);
  const place = [input.name, input.admin, input.country].filter(Boolean).join(', ');
  const raw = await generate(
    `Destination: ${place}.` + (input.from ? ` The traveller is coming from ${input.from}; "gettingThere" should cover realistic options from there.` : ' "gettingThere" should cover typical ways visitors arrive.') +
      ' Give a visitor briefing: typical daily costs at three comfort levels, a breakdown of a moderate day, ways to get there, laws a visitor could unknowingly break, local customs, emergency numbers, healthy local food, and safety tips.',
    scanJsonSchema);
  const parsed = scanSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(502, 'The AI answer was incomplete. Try again.');
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

  await spendOne(u);
  const raw = await generate(
    `A group of ${input.travellers} travelling from ${input.from} for ${input.days} days` +
      (input.month ? ` in ${input.month}` : '') + ` has a total budget of about ${Math.round(input.amountUSD)} US dollars` +
      (input.interests ? `, interested in: ${input.interests}` : '') + '. ' +
      'Suggest 3 destinations in each tier: "cheap" (comfortably under budget), "moderate" (close to budget) and "expensive" (a stretch, slightly over). ' +
      'Prefer places reachable from the origin. Include accurate latitude/longitude for each destination and realistic whole-trip totals.',
    budgetJsonSchema);
  const parsed = budgetSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(502, 'The AI answer was incomplete. Try again.');
  await store.cacheSet(key, parsed.data, 3 * 86_400);
  return { plan: parsed.data, cached: false, sample: false };
}
