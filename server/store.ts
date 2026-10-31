import { MongoClient, type Collection, type Db } from 'mongodb';
import { env } from './env.js';

export interface UserDoc { _id: string; email: string; name: string; passwordHash: string; currency: string; createdAt: Date }
export interface TripDoc {
  _id: string; userId: string; name: string; country: string; countryCode: string;
  lat: number; lon: number; note: string; createdAt: Date;
}

export interface PlanDoc {
  _id: string; userId: string; status: 'upcoming' | 'completed';
  purpose: string; destination: { name: string; country: string; countryCode: string; lat: number; lon: number };
  origin: { name: string; lat: number; lon: number };
  startDate: string; endDate: string; travellers: number; currency: string;
  plan: unknown; plannedTotalUSD: number; typicalTotalUSD: number;
  actualSpentUSD: number | null; savedUSD: number | null; distanceKm: number;
  createdAt: Date; completedAt: Date | null;
}

/** The data layer: MongoDB Atlas in production, an in-memory stand-in for local development */
export interface Store {
  findUserByEmail(email: string): Promise<UserDoc | null>;
  findUserById(id: string): Promise<UserDoc | null>;
  insertUser(u: UserDoc): Promise<void>;
  updateUserCurrency(id: string, currency: string): Promise<void>;
  updateUser(id: string, fields: Partial<Pick<UserDoc, 'name' | 'passwordHash' | 'currency'>>): Promise<void>;
  /** Removes the account and everything that belongs to it */
  deleteUser(id: string): Promise<void>;
  listTrips(userId: string): Promise<TripDoc[]>;
  insertTrip(t: TripDoc): Promise<void>;
  deleteTrip(userId: string, id: string): Promise<boolean>;
  countTrips(userId: string): Promise<number>;
  listPlans(userId: string): Promise<PlanDoc[]>;
  insertPlan(p: PlanDoc): Promise<void>;
  getPlan(userId: string, id: string): Promise<PlanDoc | null>;
  completePlan(userId: string, id: string, actualSpentUSD: number, savedUSD: number): Promise<boolean>;
  deletePlan(userId: string, id: string): Promise<boolean>;
  /** Atomically adds 1 to today's AI usage and returns the new total */
  incrementUsage(key: string): Promise<number>;
  getUsage(key: string): Promise<number>;
  cacheGet<T>(key: string): Promise<T | null>;
  cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void>;
}

// ---------------- MongoDB ----------------
interface UsageDoc { _id: string; count: number; expiresAt: Date }
interface CacheDoc { _id: string; value: unknown; expiresAt: Date }

/** Reused across invocations of the same serverless instance (cold starts connect once) */
let clientPromise: Promise<MongoClient> | null = null;

async function db(): Promise<Db> {
  if (!clientPromise) {
    const client = new MongoClient(env.mongoUri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 });
    clientPromise = client.connect().then(async (c) => {
      const d = c.db(); // database name comes from the connection string (…/orbit?…)
      await Promise.all([
        d.collection('users').createIndex({ email: 1 }, { unique: true }),
        d.collection('trips').createIndex({ userId: 1, createdAt: -1 }),
        d.collection('plans').createIndex({ userId: 1, startDate: -1 }),
        // TTL indexes: MongoDB deletes expired usage counters and cache entries automatically
        d.collection('usage').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        d.collection('cache').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      ]);
      return c;
    });
    clientPromise.catch(() => (clientPromise = null)); // retry on the next request if connecting failed
  }
  return (await clientPromise).db();
}

const col = async <T extends { _id: string }>(name: string): Promise<Collection<T>> => (await db()).collection<T>(name);

const mongoStore: Store = {
  async findUserByEmail(email) { return (await col<UserDoc>('users')).findOne({ email }); },
  async findUserById(id) { return (await col<UserDoc>('users')).findOne({ _id: id }); },
  async insertUser(u) { await (await col<UserDoc>('users')).insertOne(u); },
  async updateUserCurrency(id, currency) { await (await col<UserDoc>('users')).updateOne({ _id: id }, { $set: { currency } }); },
  async updateUser(id, fields) { await (await col<UserDoc>('users')).updateOne({ _id: id }, { $set: fields }); },
  async deleteUser(id) {
    await Promise.all([
      (await col<TripDoc>('trips')).deleteMany({ userId: id }),
      (await col<PlanDoc>('plans')).deleteMany({ userId: id }),
    ]);
    await (await col<UserDoc>('users')).deleteOne({ _id: id });
  },
  async listTrips(userId) { return (await col<TripDoc>('trips')).find({ userId }).sort({ createdAt: -1 }).limit(100).toArray(); },
  async insertTrip(t) { await (await col<TripDoc>('trips')).insertOne(t); },
  async deleteTrip(userId, id) { return (await (await col<TripDoc>('trips')).deleteOne({ _id: id, userId })).deletedCount === 1; },
  async countTrips(userId) { return (await col<TripDoc>('trips')).countDocuments({ userId }); },
  async listPlans(userId) { return (await col<PlanDoc>('plans')).find({ userId }).sort({ startDate: -1 }).limit(100).toArray(); },
  async insertPlan(p) { await (await col<PlanDoc>('plans')).insertOne(p); },
  async getPlan(userId, id) { return (await col<PlanDoc>('plans')).findOne({ _id: id, userId }); },
  async completePlan(userId, id, actualSpentUSD, savedUSD) {
    const r = await (await col<PlanDoc>('plans')).updateOne(
      { _id: id, userId, status: 'upcoming' },
      { $set: { status: 'completed', actualSpentUSD, savedUSD, completedAt: new Date() } },
    );
    return r.modifiedCount === 1;
  },
  async deletePlan(userId, id) { return (await (await col<PlanDoc>('plans')).deleteOne({ _id: id, userId })).deletedCount === 1; },
  async incrementUsage(key) {
    const doc = await (await col<UsageDoc>('usage')).findOneAndUpdate(
      { _id: key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 2 * 86_400_000) } },
      { upsert: true, returnDocument: 'after' },
    );
    return doc?.count ?? 1;
  },
  async getUsage(key) { return (await (await col<UsageDoc>('usage')).findOne({ _id: key }))?.count ?? 0; },
  async cacheGet<T>(key: string) {
    const doc = await (await col<CacheDoc>('cache')).findOne({ _id: key, expiresAt: { $gt: new Date() } });
    return (doc?.value as T) ?? null;
  },
  async cacheSet(key, value, ttl) {
    await (await col<CacheDoc>('cache')).updateOne(
      { _id: key },
      { $set: { value, expiresAt: new Date(Date.now() + ttl * 1000) } },
      { upsert: true },
    );
  },
};

// ---------------- In memory (local development only) ----------------
const mem = { plans: new Map<string, PlanDoc>(), users: new Map<string, UserDoc>(), trips: new Map<string, TripDoc>(), usage: new Map<string, number>(), cache: new Map<string, { v: unknown; exp: number }>() };

const memoryStore: Store = {
  async findUserByEmail(email) { return [...mem.users.values()].find((u) => u.email === email) ?? null; },
  async findUserById(id) { return mem.users.get(id) ?? null; },
  async insertUser(u) {
    if ([...mem.users.values()].some((x) => x.email === u.email)) throw Object.assign(new Error('duplicate'), { code: 11000 });
    mem.users.set(u._id, u);
  },
  async updateUserCurrency(id, currency) { const u = mem.users.get(id); if (u) u.currency = currency; },
  async updateUser(id, fields) { const u = mem.users.get(id); if (u) Object.assign(u, fields); },
  async deleteUser(id) {
    for (const [k, t] of mem.trips) if (t.userId === id) mem.trips.delete(k);
    for (const [k, p] of mem.plans) if (p.userId === id) mem.plans.delete(k);
    mem.users.delete(id);
  },
  async listTrips(userId) { return [...mem.trips.values()].filter((t) => t.userId === userId).sort((a, b) => +b.createdAt - +a.createdAt); },
  async insertTrip(t) { mem.trips.set(t._id, t); },
  async deleteTrip(userId, id) { const t = mem.trips.get(id); return !!t && t.userId === userId && mem.trips.delete(id); },
  async countTrips(userId) { return [...mem.trips.values()].filter((t) => t.userId === userId).length; },
  async listPlans(userId) { return [...mem.plans.values()].filter((p) => p.userId === userId).sort((a, b) => b.startDate.localeCompare(a.startDate)); },
  async insertPlan(p) { mem.plans.set(p._id, p); },
  async getPlan(userId, id) { const p = mem.plans.get(id); return p && p.userId === userId ? p : null; },
  async completePlan(userId, id, actual, saved) {
    const p = mem.plans.get(id);
    if (!p || p.userId !== userId || p.status !== 'upcoming') return false;
    Object.assign(p, { status: 'completed', actualSpentUSD: actual, savedUSD: saved, completedAt: new Date() });
    return true;
  },
  async deletePlan(userId, id) { const p = mem.plans.get(id); return !!p && p.userId === userId && mem.plans.delete(id); },
  async incrementUsage(key) { const n = (mem.usage.get(key) ?? 0) + 1; mem.usage.set(key, n); return n; },
  async getUsage(key) { return mem.usage.get(key) ?? 0; },
  async cacheGet<T>(key: string) { const e = mem.cache.get(key); return e && e.exp > Date.now() ? (e.v as T) : null; },
  async cacheSet(key, value, ttl) { mem.cache.set(key, { v: value, exp: Date.now() + ttl * 1000 }); },
};

export const store: Store = env.mongoUri ? mongoStore : memoryStore;
export const usingMemoryStore = !env.mongoUri;
