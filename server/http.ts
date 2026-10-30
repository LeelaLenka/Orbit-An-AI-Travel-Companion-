import type { IncomingMessage, ServerResponse } from 'node:http';

/** Vercel's Node runtime passes plain Node request/response objects (with an optional parsed body) */
export type Req = IncomingMessage & { body?: unknown };
export type Res = ServerResponse;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function sendJson(res: Res, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export async function readJson(req: Req): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 64_000) throw new HttpError(413, 'Request is too large.');
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, 'Request body must be JSON.');
  }
}

export function getCookie(req: Req, name: string): string | undefined {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

export function sessionCookie(name: string, value: string, maxAgeSeconds: number, secure: boolean): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly', // not readable from JavaScript, so a script injection can't steal it
    'SameSite=Lax',
    secure ? 'Secure' : '',
    `Max-Age=${maxAgeSeconds}`,
  ].filter(Boolean).join('; ');
}

export function clientIp(req: Req): string {
  const fwd = req.headers['x-forwarded-for'];
  return (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
}
