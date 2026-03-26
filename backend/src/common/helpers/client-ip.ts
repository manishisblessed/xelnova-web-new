import type { Request } from 'express';

/** Best-effort client IP from proxies (x-forwarded-for) or the socket. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const val = typeof forwarded === 'string' ? forwarded : forwarded[0];
    return val.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '';
}
