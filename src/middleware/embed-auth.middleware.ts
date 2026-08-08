import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import config from '@config/index';

/**
 * Guards POST /api/embed/session. Only a third-party BACKEND should ever call
 * this (never a browser) — it mints a real login token. Compared with
 * timingSafeEqual because, unlike the Hotmart webhook token, this secret
 * gates issuing a session, not just a user-creation event.
 */
export function embedAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!config.embedSharedSecret) {
    res.status(500).json({
      error: 'Server Configuration Error',
      message: 'Embed SSO not configured (EMBED_SHARED_SECRET missing)',
    });
    return;
  }

  const provided = req.header('x-embed-token');
  if (!provided || !safeEqual(provided, config.embedSharedSecret)) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing x-embed-token' });
    return;
  }

  next();
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
