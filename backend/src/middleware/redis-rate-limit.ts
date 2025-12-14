import { Request, Response, NextFunction } from 'express';
import { redis } from '../services/cache.service.js';
import { env } from '../config/env.js';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  keyGenerator?: (req: Request) => string; // Custom key generation
  skip?: (req: Request) => boolean; // Skip rate limiting for certain requests
}

// Whitelist of IPs that bypass rate limiting (e.g., monitoring services, CI/CD)
const WHITELISTED_IPS = (env.RATE_LIMIT_WHITELIST || '').split(',').filter(Boolean);

// Check if rate limiting should be disabled (for development or specific environments)
const RATE_LIMIT_ENABLED = env.NODE_ENV === 'production' || env.ENABLE_RATE_LIMIT === 'true';

/**
 * Redis-based rate limiter middleware
 * Compatible with multiple server instances
 */
export function redisRateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    keyGenerator = (req) => req.ip || 'unknown',
    skip,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip rate limiting if disabled for environment
      if (!RATE_LIMIT_ENABLED) {
        return next();
      }

      // Check if IP is whitelisted
      const clientIp = req.ip || '';
      if (WHITELISTED_IPS.includes(clientIp)) {
        return next();
      }

      // Custom skip function
      if (skip && skip(req)) {
        return next();
      }

      const key = `rate-limit:${keyGenerator(req)}:${req.path}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Remove old entries outside the time window
      await redis.zremrangebyscore(key, '-inf', windowStart.toString());

      // Get current count
      const count = await redis.zcard(key);

      if (count >= max) {
        // Get TTL for rate limit reset
        const ttl = await redis.pttl(key);
        const resetTime = ttl > 0 ? Math.ceil(ttl / 1000) : Math.ceil(windowMs / 1000);

        res.set('X-RateLimit-Limit', max.toString());
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', resetTime.toString());
        res.set('Retry-After', resetTime.toString());

        res.status(429).json({
          error: message,
          retryAfter: resetTime,
        });
        return;
      }

      // Add current request
      await redis.zadd(key, now.toString(), `${now}:${Math.random()}`);

      // Set expiry on the key
      await redis.pexpire(key, windowMs);

      // Set rate limit headers
      res.set('X-RateLimit-Limit', max.toString());
      res.set('X-RateLimit-Remaining', (max - count - 1).toString());

      if (skipSuccessfulRequests) {
        // Store reference to remove request if successful
        const requestId = `${now}:${Math.random()}`;
        (req as any).rateLimitKey = key;
        (req as any).rateLimitRequestId = requestId;

        // Override res.json to remove request on success
        const originalJson = res.json.bind(res);
        res.json = function (body: any) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            redis.zrem(key, requestId).catch(console.error);
          }
          return originalJson(body);
        };
      }

      next();
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // Fail open - allow request if Redis is down
      next();
    }
  };
}

/**
 * Pre-configured rate limiters with environment-aware limits
 * Optimized for India's scale with shared IPs and high mobile usage
 */

// Get rate limits from environment or use defaults
const getLimit = (devLimit: number, prodLimit: number) => {
  return env.NODE_ENV === 'production' ? prodLimit : devLimit;
};

/**
 * General API Rate Limit
 * HIGH limit because of:
 * - Shared IPs in India (offices, universities, mobile carriers)
 * - CGNAT (Carrier-Grade NAT) where thousands share same IP
 * - Public WiFi in cafes, malls, airports
 */
export const apiRateLimit = redisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: getLimit(10000, 10000), // 10,000 requests per 15 min (realistic for shared IPs)
  message: 'Too many requests from this IP, please try again later.',
});

/**
 * Authentication Rate Limit
 * Per-IP limit is kept moderate because:
 * - Needs to prevent brute force attacks
 * - But allow multiple users on same IP (offices, universities)
 * - Successful logins don't count (skipSuccessfulRequests: true)
 */
export const authRateLimit = redisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: getLimit(50, 50), // 50 failed auth attempts per 15 min per IP (allows shared IPs)
  message: 'Too many authentication attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true, // Only count failed attempts
});

/**
 * Search Rate Limit
 * HIGH limit because search is core functionality
 * Users on shared IPs (mobile carriers) need generous limits
 */
export const searchRateLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: getLimit(500, 300), // 300 searches per minute (allows ~5 searches/sec from shared IP)
  message: 'Too many search requests, please slow down.',
});

/**
 * Deal Creation Rate Limit
 * Uses USER ID when authenticated, falls back to IP
 * This is the most important rate limit for preventing spam
 */
export const dealCreationRateLimit = redisRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: getLimit(100, 20), // 20 deals per hour per user/IP
  message: 'Too many deals created, please wait before posting more.',
  keyGenerator: (req) => {
    // Use user ID if authenticated (most accurate)
    const userId = (req as any).userId;
    if (userId) {
      return `user:${userId}`;
    }
    // Fallback to IP for anonymous users
    return `ip:${req.ip || 'unknown'}`;
  },
});
