import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { DEMO, env } from './env.js';
import { getCookie, HttpError, sessionCookie, type Req, type Res } from './http.js';
import { store, type UserDoc } from './store.js';

const COOKIE = 'orbit_session';
const WEEK = 7 * 86_400;

function secret(): Uint8Array {
  if (env.jwtSecret.length < 32) {
    if (env.isProduction) throw new HttpError(500, 'Server is missing JWT_SECRET (32+ characters).');
    return new TextEncoder().encode('local-development-secret-not-for-production!!');
  }
  return new TextEncoder().encode(env.jwtSecret);
}

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(120),
  password: z.string().min(8, 'Use at least 8 characters').max(100),
});
export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(100) });

export interface PublicUser { id: string; name: string; email: string; currency: string; demo: boolean }
export const toPublic = (u: UserDoc): PublicUser => ({ id: u._id, name: u.name, email: u.email, currency: u.currency, demo: u.email === DEMO.email });

/** The recruiter demo account is created on first use */
let demoReady: Promise<void> | null = null;
export function ensureDemoUser(): Promise<void> {
  demoReady ??= (async () => {
    if (await store.findUserByEmail(DEMO.email)) return;
    await store.insertUser({ _id: randomUUID(), email: DEMO.email, name: DEMO.name, currency: 'INR',
      passwordHash: await bcrypt.hash(DEMO.password, 10), createdAt: new Date() }).catch(() => {});
  })();
  demoReady.catch(() => (demoReady = null));
  return demoReady;
}

export async function register(input: z.infer<typeof registerSchema>): Promise<UserDoc> {
  const user: UserDoc = { _id: randomUUID(), email: input.email, name: input.name, currency: 'INR',
    passwordHash: await bcrypt.hash(input.password, 12), createdAt: new Date() };
  try {
    await store.insertUser(user);
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new HttpError(409, 'An account with this email already exists. Log in instead.');
    throw e;
  }
  return user;
}

// A real hash compared against when the email doesn't exist, so both cases take the same time
const DUMMY_HASH = bcrypt.hashSync('orbit-timing-dummy', 12);

export async function login(input: z.infer<typeof loginSchema>): Promise<UserDoc> {
  await ensureDemoUser();
  const user = await store.findUserByEmail(input.email);
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'That email and password don’t match.');
  return user;
}

export async function startSession(res: Res, user: UserDoc): Promise<void> {
  const token = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(user._id)
    .setIssuedAt().setExpirationTime('7d').sign(secret());
  res.setHeader('Set-Cookie', sessionCookie(COOKIE, token, WEEK, env.isProduction));
}

export function endSession(res: Res): void {
  res.setHeader('Set-Cookie', sessionCookie(COOKIE, '', 0, env.isProduction));
}

/** The logged-in user, or a 401 */
export async function requireUser(req: Req): Promise<UserDoc> {
  const token = getCookie(req, COOKIE);
  if (!token) throw new HttpError(401, 'Log in to continue.');
  try {
    const { payload } = await jwtVerify(token, secret());
    const user = payload.sub ? await store.findUserById(payload.sub) : null;
    if (!user) throw new Error('missing');
    return user;
  } catch {
    throw new HttpError(401, 'Your session has expired. Log in again.');
  }
}
