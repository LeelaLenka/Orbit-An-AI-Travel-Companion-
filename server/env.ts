/** Configuration from environment variables, read once */
const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);

export const env = {
  isProduction: process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production',
  mongoUri: process.env.MONGODB_URI ?? '',
  geminiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? '',
  /** Only for local testing against a fake Gemini server */
  geminiBaseUrl: process.env.GEMINI_BASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  aiDailyLimit: num(process.env.AI_DAILY_LIMIT, 30),
  demoDailyLimit: num(process.env.DEMO_DAILY_LIMIT, 60),
  /** Only for local testing without internet: sample weather, places, rates and imagery */
  mockExternal: process.env.MOCK_EXTERNAL === '1',
};

export const DEMO = { email: 'demo@orbit.travel', password: 'explore-orbit', name: 'Demo Traveller' };
