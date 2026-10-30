import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { budgetInput, planBudget, scanDestination, scanInput, usage } from './ai.js';
import { endSession, ensureDemoUser, login, loginSchema, register, registerSchema, requireUser, startSession, toPublic } from './auth.js';
import { DEMO } from './env.js';
import { getPlaceInfo, getRates, getSatelliteImage, getWeather, searchPlaces } from './external.js';
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

    // ---------- signed in ----------
    const user = await requireUser(req);

    if (route === 'auth/me' && method === 'GET') return sendJson(res, 200, { user: toPublic(user), usage: await usage(user) });
    if (route === 'me/currency' && method === 'PUT') {
      const { currency } = currencyInput.parse(await readJson(req));
      await store.updateUserCurrency(user._id, currency);
      return sendJson(res, 200, { ok: true });
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

    if (route === 'ai/scan' && method === 'POST') {
      const result = await scanDestination(user, scanInput.parse(await readJson(req)));
      return sendJson(res, 200, { ...result, usage: await usage(user) });
    }
    if (route === 'ai/budget' && method === 'POST') {
      const result = await planBudget(user, budgetInput.parse(await readJson(req)));
      return sendJson(res, 200, { ...result, usage: await usage(user) });
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
