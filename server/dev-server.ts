// Local development: serves /api on port 3001 (Vite proxies to it). Reads .env if present.
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '');
  }
}

const { handle } = await import('./router.js');
const port = Number(process.env.API_PORT ?? 3001);
createServer((req, res) => void handle(req, res)).listen(port, () => {
  console.log(`Orbit API on http://localhost:${port}  (store: ${process.env.MONGODB_URI ? 'MongoDB' : 'in-memory'}, AI: ${process.env.GEMINI_API_KEY ? 'Gemini' : 'sample answers'})`);
});
