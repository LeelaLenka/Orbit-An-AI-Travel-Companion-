# Orbit: AI travel companion

Explore Earth on a 3D globe built from **yesterday's NASA satellite imagery**, check **live weather** anywhere,
get an **AI briefing** on any town, and find destinations that **fit your budget**, in your own currency.

**Live:** [orbit-an-ai-travel-companion.vercel.app](https://orbit-an-ai-travel-companion.vercel.app) · demo account on the login page.

## Features
- **3D satellite globe**: NASA GIBS VIIRS true-colour imagery from yesterday, with Blue Marble filling gaps
- **Search exact addresses, streets, villages, landmarks and cities** (Photon / OpenStreetMap); addresses and
  landmarks open a **street-level map** (OpenStreetMap or satellite), cities fly the globe
- **Place overview**: description and photo (Wikipedia), plus traveller facts for the country (currency, languages,
  calling code, driving side, time zone)
- **Famous places within 10 km**, ranked by Wikipedia readership, with photos, pinned on the globe and map
- **Getting there**: distance and time by walk, bike and car over real roads (OSRM / OpenStreetMap routing), plus
  flight and ship estimates, with a recommended mode; from your location or any place
- **Coordinates search**: type `18.1135, 83.4019` (or `18.1135° N, 83.4019° E`) to pin an exact spot, named by reverse geocoding
- **Near you**: with permission, recommends famous places around your current location
- **Route optimiser**: visits nearby famous places in a short order using nearest-neighbour + 2-opt (TSP heuristics)
  over a haversine distance matrix, and draws the route on the map
- **Trip planner** with purpose tags (Pilgrimage, Vacation, Work, Family, Adventure, Other): travel there and back,
  **real hotels from OpenStreetMap**, food, day-by-day plan and budget; accept to save it
- **Trip lifecycle**: after the end date Orbit asks what you spent and shows the saving against a typical trip;
  past trips, total saved and distance travelled are kept in your account
- **Bine**, a multilingual voice assistant: speak in English, Hindi, Telugu, Tamil and more, and hear the answer in
  the same language (Web Speech API + Gemini)
- **Browse without an account**; saving, planning, budgets and Bine ask you to log in when you use them
- **Settings**: dark / light / system theme, °C or °F, km or miles, default map style, Bine voice and language, reduced motion
- **Account settings**: change name, password and default currency, see today's AI usage, delete the account (and all its data)
- **Bine knows your context**: your currency, upcoming and past trips and saved places, and answers general questions too
- **Live weather**: current conditions and a 7-day forecast (Open-Meteo)
- **AI destination scan** (Gemini): daily costs at three comfort levels, a cost breakdown, ways to get there,
  laws visitors could break unknowingly, customs, emergency numbers, healthy local food and safety tips
- **Budget planner**: enter a budget in any of 160+ currencies and get cheap / moderate / expensive destinations,
  converted at live exchange rates, each marked as fitting your budget or not
- **Accounts required**, with a shared demo account for visitors; installable as an app (PWA)

## Algorithms
- **Haversine** great-circle distance (server `server/geo.ts`, client `src/lib/geo.ts`)
- **Nearest-neighbour + 2-opt** route improvement for multi-stop visits, O(n²) per pass
- **Mode recommendation** rules from distance and real road travel time

## How it's built
- **Frontend:** React 19, TypeScript, Vite, globe.gl / three.js, Leaflet
- **Backend:** one Vercel serverless function (TypeScript) that routes every `/api/*` request
- **Database:** MongoDB Atlas via the official Node.js driver: users (unique email index), saved places,
  per-user daily AI usage counters (atomic `$inc` upserts) and a response cache, both cleaned up by **TTL indexes**
- **AI:** Gemini through `@google/genai` with **JSON-schema-constrained output**, validated with **Zod**,
  cached in MongoDB so repeated questions cost nothing, and limited per user per day
- **Security:** bcrypt password hashing, JWT sessions in **HttpOnly, SameSite** cookies, input validation on every
  endpoint, sign-in throttling, and the Gemini key kept server-side only
- **Data sources (free, no keys):** Photon/OpenStreetMap (search), Wikipedia (places), REST Countries, Open-Meteo (weather), ExchangeRate-API, NASA GIBS, CARTO/Esri map tiles

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
| GET | `/api/places?q=`, `/api/place-info?lat=&lon=&name=&cc=`, `/api/weather?lat=&lon=`, `/api/rates`, `/api/satellite` | live data |
| POST | `/api/ai/scan`, `/api/ai/budget` | AI (rate-limited, cached) |
| GET, POST, DELETE | `/api/trips`, `/api/trips/:id` | saved places |
| POST, GET, DELETE | `/api/plans/draft`, `/api/plans`, `/api/plans/:id/complete`, `/api/plans/:id` | trip plans |
| POST | `/api/assistant` | Bine |
| PUT, DELETE | `/api/me/profile`, `/api/me/password`, `/api/me/currency`, `/api/me` | account |
