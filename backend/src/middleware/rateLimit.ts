import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const keyByUserOrIp = (req: Request) => req.user?.uid ?? ipKeyGenerator(req.ip ?? '0.0.0.0');

const handler = (message: string) => ({
  success: false,
  error: { code: 'RATE_LIMITED', message },
});

/** Baseline limiter for the whole API. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: handler('Too many requests, please slow down.'),
});

/** Strict limiter for sensitive / expensive endpoints (profile creation, report creation, AI calls). */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: handler('Too many submissions. Please try again later.'),
});

/** Limiter for chatty write endpoints (comments, supports, verifications). */
export const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: handler('Too many actions. Please try again shortly.'),
});
