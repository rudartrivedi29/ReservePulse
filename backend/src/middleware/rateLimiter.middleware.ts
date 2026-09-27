import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/apiResponse';
import { config } from '../config/env';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  errorCode?: string;
  skipInTest?: boolean;
}

const createRateLimiter = (options: RateLimitOptions) => {
  const store = new Map<string, RateLimitRecord>();

  // Periodically sweep expired IP records to prevent memory leak
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(ip);
      }
    }
  }, Math.max(options.windowMs, 30000));
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip in automated test environment or when NODE_ENV === 'test'
    if (options.skipInTest && (config.env === 'test' || process.env.NODE_ENV === 'test')) {
      return next();
    }

    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    const now = Date.now();
    let record = store.get(ip);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      store.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, options.max - record.count);
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > options.max) {
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json(
        errorResponse(
          options.message,
          options.errorCode || 'RATE_LIMIT_EXCEEDED',
          { retryAfterSeconds }
        )
      );
      return;
    }

    next();
  };
};

/**
 * Strict Rate Limiter for Authentication endpoints (Login, Signup, OTP, Password Reset)
 * 30 requests per 10 minutes per IP
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts from this IP address. Please try again later.',
  errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
  skipInTest: true,
});

/**
 * General API Rate Limiter
 * 500 requests per minute per IP
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 500,
  message: 'Too many requests. Please slow down.',
  errorCode: 'API_RATE_LIMIT_EXCEEDED',
  skipInTest: true,
});
