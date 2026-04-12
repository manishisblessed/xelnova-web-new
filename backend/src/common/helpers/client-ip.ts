import type { Request } from 'express';

/** Best-effort client IP from proxies or the socket.
 *  Checks multiple proxy headers in priority order. */
export function getClientIp(req: Request): string {
  // CloudFront / Cloudflare specific headers (most reliable when available)
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return (typeof cfIp === 'string' ? cfIp : cfIp[0]).trim();

  const realIp = req.headers['x-real-ip'];
  if (realIp) return (typeof realIp === 'string' ? realIp : realIp[0]).trim();

  // Standard proxy header — first entry is the original client
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const val = typeof forwarded === 'string' ? forwarded : forwarded[0];
    const first = val.split(',')[0].trim();
    // Strip IPv6-mapped IPv4 prefix
    if (first.startsWith('::ffff:')) return first.slice(7);
    return first;
  }

  let ip = req.ip || req.socket?.remoteAddress || '';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip;
}
