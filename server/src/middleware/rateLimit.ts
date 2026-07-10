import { RequestHandler } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const entries = new Map<string, RateLimitEntry>();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key);
  }
}, 10 * 60 * 1000);
cleanupTimer.unref();

export function rateLimit(options: { windowMs: number; max: number }): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const current = entries.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current;

    entry.count += 1;
    entries.set(key, entry);

    const remaining = Math.max(0, options.max - entry.count);
    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ message: 'Demasiados intentos. Intenta de nuevo más tarde.' });
      return;
    }

    next();
  };
}
