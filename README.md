# Orbit: AI travel companion

Explore Earth on a 3D globe built from **yesterday's NASA satellite imagery**, check **live weather** anywhere,
get an **AI briefing** on any town, and find destinations that **fit your budget**, in your own currency.

**Live:** _add your Vercel URL_ · Demo account is shown on the login page.

## Features
- **3D satellite globe**: NASA GIBS VIIRS true-colour imagery from yesterday, with Blue Marble filling gaps
- **Search any place on Earth** and fly to it; save places to your account
- **Live weather**: current conditions and a 7-day forecast (Open-Meteo)
- **AI destination scan** (Gemini): daily costs at three comfort levels, a cost breakdown, ways to get there,
  laws visitors could break unknowingly, customs, emergency numbers, healthy local food and safety tips
- **Budget planner**: enter a budget in any of 160+ currencies and get cheap / moderate / expensive destinations,
  converted at live exchange rates, each marked as fitting your budget or not
- **Accounts required**, with a shared demo account for visitors; installable as an app (PWA)

## How it's built
- **Frontend:** React 19, TypeScript, Vite, globe.gl / three.js
- **Backend:** one Vercel serverless function (TypeScript) that routes every `/api/*` request
- **Database:** MongoDB Atlas via the official Node.js driver: users (unique email index), saved places,
  per-user daily AI usage counters (atomic `$inc` upserts) and a response cache, both cleaned up by **TTL indexes**
- **AI:** Gemini through `@google/genai` with **JSON-schema-constrained output**, validated with **Zod**,
  cached in MongoDB so repeated questions cost nothing, and limited per user per day
- **Security:** bcrypt password hashing, JWT sessions in **HttpOnly, SameSite** cookies, input validation on every
  endpoint, sign-in throttling, and the Gemini key kept server-side only
- **Data sources (free, no keys):** Open-Meteo (geocoding + weather), ExchangeRate-API open access, NASA GIBS

AI costs are estimates, clearly labelled as such, and never presented as live prices.

## Run locally
```bash
npm install
cp .env.example .env        # optional: add MONGODB_URI and GEMINI_API_KEY
npm run dev                 # API on :3001
npx vite                    # app on http://localhost:5173 (in another terminal)
```
Without `MONGODB_URI` the API uses a temporary in-memory store; without `GEMINI_API_KEY` it returns sample answers.

## Deploy (Vercel)
Import the repo (framework: Vite) and add environment variables `MONGODB_URI`, `GEMINI_API_KEY`, `JWT_SECRET`
(32+ random characters) and optionally `GEMINI_MODEL` and `AI_DAILY_LIMIT`. `vercel.json` routes `/api/*` to the function.

## API
| Method | Route | |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | account |
| GET | `/api/auth/me`, `/api/auth/demo` | session, demo credentials |
| GET | `/api/places?q=`, `/api/weather?lat=&lon=`, `/api/rates`, `/api/satellite` | live data |
| POST | `/api/ai/scan`, `/api/ai/budget` | AI (rate-limited, cached) |
| GET, POST, DELETE | `/api/trips`, `/api/trips/:id` | saved places |
