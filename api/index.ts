// Vercel serverless function: every /api/* request is routed here (see vercel.json)
import { handle } from '../server/router.js';
import type { Req, Res } from '../server/http.js';

export default function handler(req: Req, res: Res): Promise<void> {
  return handle(req, res);
}
