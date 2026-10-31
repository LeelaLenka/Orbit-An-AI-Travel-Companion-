import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { askBine, budgetInput, chatInput, draftPlan, planBudget, planInput, scanDestination, scanInput, usage } from './ai.js';
import { endSession, ensureDemoUser, login, loginSchema, register, registerSchema, requireUser, startSession, toPublic } from './auth.js';
import { DEMO } from './env.js';
import { getFeatured, getHotels, getPlaceInfo, getRates, getRoute, getSatelliteImage, getWeather, searchPlaces } from './external.js';
import { haversineKm } from './geo.js';
import { clientIp, HttpError, readJson, sendJson, type Req, type Res } from './http.js';
import { store, usingMemoryStore } from './store.js';

/** Throttles sign-in attempts per IP (stored in MongoDB, so it holds across serverless instances) */
async function throttle(req: Req, name: string, perHour: number): Promise<void> {
  const hour = new Date().toISOString().slice(0, 13);
  const n = await store.incrementUsage(`${name}:${clientIp(req)}:${hour}`);
  if (n > perHour) throw new HttpError(429, 'Too many attempts. Try again in an hour.');
}

const coords = z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) });
const tripInput = z.object({
  name: z.string().trim().min(1).max(80), country: z.string().trim().max(80).default(''), countryCode: z.string().trim().max(3).default(''),
  lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180), note: z.string().trim().max(300).default(''),
});
const currencyInput = z.object({ currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/) });

export async function handle(req: Req, res: Res): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  // On Vercel the path arrives as ?route=… (see vercel.json); locally it's the URL path
  const route = (url.searchParams.get('route') ?? url.pathname.replace(/^\/api\/?/, '')).replace(/\/+$/, '');
  const method = req.method ?? 'GET';
  const q = (k: string) => url.searchParams.get(k) ?? '';

  try {
    // ---------- public ----------
    if (route === 'health') return sendJson(res, 200, { ok: true, store: usingMemoryStore ? 'memory' : 'mongodb' });

    if (route === 'satellite' && method === 'GET') {
      const img = await getSatelliteImage();
      res.statusCode = 200;
      res.setHeader('Content-Type', img.type);
      res.setHeader('X-Imagery-Date', img.date);
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=43200'); // Vercel's CDN keeps it for 12 h
      res.end(img.bytes);
      return;
    }

    if (route === 'auth/register' && method === 'POST') {
      await throttle(req, 'register', 10);
      const user = await register(registerSchema.parse(await readJson(req)));
      await startSession(res, user);
      return sendJson(res, 201, { user: toPublic(user) });
    }
    if (route === 'auth/login' && method === 'POST') {
      await throttle(req, 'login', 30);
      const user = await login(loginSchema.parse(await readJson(req)));
      await startSession(res, user);
      return sendJson(res, 200, { user: toPublic(user) });
    }
    if (route === 'auth/logout' && method === 'POST') {
      endSession(res);
      return sendJson(res, 200, { ok: true });
    }
    if (route === 'auth/demo' && method === 'GET') {
      await ensureDemoUser();
      return sendJson(res, 200, { email: DEMO.email, password: DEMO.password });
    }

    // ---------- public browsing (rate-limited per visitor) ----------
    const isPublicData = ['places', 'place-info', 'weather', 'rates', 'route', 'featured'].includes(route) && method === 'GET';
    if (isPublicData) await throttle(req, 'pub', 400);

    if (route === 'featured' && method === 'GET') {
      res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=86400');
      return sendJson(res, 200, { places: await getFeatured() });
    }
    if (route === 'places' && method === 'GET') {
      const term = q('q').trim();
      if (term.length < 2) return sendJson(res, 200, { places: [] });
      return sendJson(res, 200, { places: await searchPlaces(term.slice(0, 80)) });
    }
    if (route === 'weather' && method === 'GET') {
      const { lat, lon } = coords.parse({ lat: q('lat'), lon: q('lon') });
      return sendJson(res, 200, { weather: await getWeather(lat, lon) });
    }
    if (route === 'place-info' && method === 'GET') {
      const { lat, lon } = coords.parse({ lat: q('lat'), lon: q('lon') });
      const name = q('name').trim().slice(0, 80);
      const cc = q('cc').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
      return sendJson(res, 200, { info: await getPlaceInfo(lat, lon, name, cc) });
    }
    if (route === 'rates' && method === 'GET') return sendJson(res, 200, await getRates());
    if (route === 'route' && method === 'GET') {
      const from = coords.parse({ lat: q('fromLat'), lon: q('fromLon') });
      const to = coords.parse({ lat: q('toLat'), lon: q('toLon') });
      return sendJson(res, 200, { route: await getRoute(from.lat, from.lon, to.lat, to.lon) });
    }


    // ---------- signed in ----------
    const user = await requireUser(req);

    if (route === 'auth/me' && method === 'GET') return sendJson(res, 200, { user: toPublic(user), usage: await usage(user) });
    if (route === 'me/currency' && method === 'PUT') {
      const { currency } = currencyInput.parse(await readJson(req));
      await store.updateUserCurrency(user._id, currency);
      return sendJson(res, 200, { ok: true });
    }

    if (route === 'ai/scan' && method === 'POST') {
      const result = await scanDestination(user, scanInput.parse(await readJson(req)));
      return sendJson(res, 200, { ...result, usage: await usage(user) });
    }
    if (route === 'ai/budget' && method === 'POST') {
      const result = await planBudget(user, budgetInput.parse(await readJson(req)));
      return sendJson(res, 200, { ...result, usage: await usage(user) });
    }

    if (route === 'assistant' && method === 'POST') {
      const r = await askBine(user, chatInput.parse(await readJson(req)));
      return sendJson(res, 200, { ...r, usage: await usage(user) });
    }

    // Trip plans: draft (not saved) -> accept (saved as upcoming) -> complete (savings recorded)
    if (route === 'plans/draft' && method === 'POST') {
      const input = planInput.parse(await readJson(req));
      const [routeInfo, hotels] = await Promise.all([
        getRoute(input.origin.lat, input.origin.lon, input.destination.lat, input.destination.lon),
        getHotels(input.destination.lat, input.destination.lon),
      ]);
      const routeText = routeInfo.modes.filter((m) => m.available).map((m) => `${m.mode} ${m.distanceKm} km ~${Math.round(m.minutes / 6) / 10} h (${m.source})`).join('; ') || `straight-line ${routeInfo.straightKm} km`;
      const hotelText = hotels.map((h) => `${h.name} (${h.kind}${h.stars ? `, ${h.stars}-star` : ''}, ${h.distanceKm} km from centre)`).join('; ');
      const { plan, sample } = await draftPlan(user, input, { route: routeText, hotels: hotelText });
      return sendJson(res, 200, { plan, sample, route: routeInfo, hotels, usage: await usage(user) });
    }
    if (route === 'plans' && method === 'GET') return sendJson(res, 200, { plans: (await store.listPlans(user._id)).map(({ userId: _u, ...p }) => p) });
    if (route === 'plans' && method === 'POST') {
      const body = (await readJson(req)) as Record<string, unknown>;
      const input = planInput.parse(body.input);
      const totals = z.object({ plannedTotalUSD: z.number().nonnegative().max(10_000_000), typicalTotalUSD: z.number().nonnegative().max(10_000_000) }).parse(body);
      const currency = z.string().regex(/^[A-Z]{3}$/).catch('USD').parse(body.currency);
      if ((await store.listPlans(user._id)).length >= 100) throw new HttpError(400, 'You can keep up to 100 trips.');
      const doc = {
        _id: randomUUID(), userId: user._id, status: 'upcoming' as const, purpose: input.purpose, destination: input.destination,
        origin: input.origin, startDate: input.startDate, endDate: input.endDate, travellers: input.travellers, currency,
        plan: body.plan, plannedTotalUSD: totals.plannedTotalUSD, typicalTotalUSD: totals.typicalTotalUSD,
        actualSpentUSD: null, savedUSD: null,
        distanceKm: Math.round(haversineKm(input.origin.lat, input.origin.lon, input.destination.lat, input.destination.lon)),
        createdAt: new Date(), completedAt: null,
      };
      await store.insertPlan(doc);
      const { userId: _u, ...pub } = doc;
      return sendJson(res, 201, { plan: pub });
    }
    const planId = /^plans\/([0-9a-f-]{36})(\/complete)?$/.exec(route);
    if (planId && planId[2] && method === 'POST') {
      const { actualSpentUSD } = z.object({ actualSpentUSD: z.number().nonnegative().max(10_000_000) }).parse(await readJson(req));
      const p = await store.getPlan(user._id, planId[1]!);
      if (!p) throw new HttpError(404, 'Trip not found.');
      const saved = Math.round((p.typicalTotalUSD - actualSpentUSD) * 100) / 100;
      if (!(await store.completePlan(user._id, p._id, actualSpentUSD, saved))) throw new HttpError(409, 'This trip is already marked complete.');
      return sendJson(res, 200, { savedUSD: saved });
    }
    if (planId && !planId[2] && method === 'DELETE') {
      if (!(await store.deletePlan(user._id, planId[1]!))) throw new HttpError(404, 'Trip not found.');
      return sendJson(res, 200, { ok: true });
    }

    if (route === 'trips' && method === 'GET') return sendJson(res, 200, { trips: (await store.listTrips(user._id)).map(({ userId: _u, ...t }) => t) });
    if (route === 'trips' && method === 'POST') {
      if ((await store.countTrips(user._id)) >= 100) throw new HttpError(400, 'You can save up to 100 places.');
      const t = tripInput.parse(await readJson(req));
      const trip = { _id: randomUUID(), userId: user._id, createdAt: new Date(), ...t };
      await store.insertTrip(trip);
      const { userId: _u, ...pub } = trip;
      return sendJson(res, 201, { trip: pub });
    }
    const del = /^trips\/([0-9a-f-]{36})$/.exec(route);
    if (del && method === 'DELETE') {
      if (!(await store.deleteTrip(user._id, del[1]!))) throw new HttpError(404, 'Saved place not found.');
      return sendJson(res, 200, { ok: true });
    }

    throw new HttpError(404, 'Not found.');
  } catch (e) {
    if (e instanceof ZodError) {
      const i = e.issues[0];
      return sendJson(res, 400, { error: i ? `${i.path.join('.') || 'input'}: ${i.message}` : 'Invalid input.' });
    }
    if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message });
    console.error('[orbit] unexpected error', e instanceof Error ? e.message : e);
    return sendJson(res, 500, { error: 'Something went wrong on the server.' });
  }
}
