import { NextFunction, Request, Response } from "express";
import { logger } from "firebase-functions";

// 🚨 EMERGENCY FIX: Use in-memory rate limiting instead of Firestore
// This avoids any Firestore connection issues during high load or network problems

interface RateLimitEntry {
  hitCount: number;
  totalRequests: number;
  resetTime: Date;
  lastRequest: Date;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = new Date();
  let cleaned = 0;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.info(`🧹 Cleaned ${cleaned} expired rate limit entries`, {
      remaining: rateLimitStore.size
    });
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

/**
 * Middleware de limitation de taux - VERSION MÉMOIRE
 * Utilise la mémoire locale au lieu de Firestore pour éviter les problèmes de connexion
 */
export const rateLimitMemory = (config: RateLimitConfig) => {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = "Trop de requêtes, veuillez réessayer plus tard",
    standardHeaders = true,
    legacyHeaders = false,
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting on health check endpoints
    const isHealthCheck = req.path.includes('/health') || 
                         req.url.includes('/health') || 
                         req.originalUrl?.includes('/health');
    
    if (isHealthCheck) {
      return next();
    }

    try {
      const key = keyGenerator(req);
      const now = new Date();
      const resetTime = new Date(Math.ceil(now.getTime() / windowMs) * windowMs);

      // Get or create entry
      let entry = rateLimitStore.get(key);

      if (!entry || entry.resetTime <= now) {
        // Create new entry or reset expired one
        entry = {
          hitCount: 0,
          totalRequests: 0,
          resetTime,
          lastRequest: now
        };
      }

      // Increment counters
      entry.hitCount++;
      entry.totalRequests++;
      entry.lastRequest = now;

      // Save entry
      rateLimitStore.set(key, entry);

      // Check limit
      if (entry.hitCount > maxRequests) {
        logger.warn("Rate limit exceeded", {
          key,
          hitCount: entry.hitCount,
          maxRequests,
          ip: req.ip,
          endpoint: req.path,
          method: req.method
        });

        // Add headers
        // 🚨 FIX: Use setHeader instead of set() to avoid "field.toLowerCase is not a function" error
        if (standardHeaders) {
          res.setHeader("RateLimit-Limit", maxRequests.toString());
          res.setHeader("RateLimit-Remaining", "0");
          res.setHeader("RateLimit-Reset", resetTime.getTime().toString());
        }

        if (legacyHeaders) {
          res.setHeader("X-RateLimit-Limit", maxRequests.toString());
          res.setHeader("X-RateLimit-Remaining", "0");
          res.setHeader("X-RateLimit-Reset", resetTime.getTime().toString());
        }

        return res.status(429).json({
          success: false,
          error: "RATE_LIMIT_EXCEEDED",
          message,
          retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000),
        });
      }

      // Add informative headers
      // 🚨 FIX: Use setHeader instead of set() to avoid "field.toLowerCase is not a function" error
      const remaining = Math.max(0, maxRequests - entry.hitCount);

      if (standardHeaders) {
        res.setHeader("RateLimit-Limit", maxRequests.toString());
        res.setHeader("RateLimit-Remaining", remaining.toString());
        res.setHeader("RateLimit-Reset", resetTime.getTime().toString());
      }

      if (legacyHeaders) {
        res.setHeader("X-RateLimit-Limit", maxRequests.toString());
        res.setHeader("X-RateLimit-Remaining", remaining.toString());
        res.setHeader("X-RateLimit-Reset", resetTime.getTime().toString());
      }

      // Handle response counting
      const originalSend = res.send;
      res.send = function (data) {
        const shouldCount = !(
          (skipSuccessfulRequests && res.statusCode < 400) ||
          (skipFailedRequests && res.statusCode >= 400)
        );

        if (!shouldCount && entry) {
          entry.hitCount = Math.max(0, entry.hitCount - 1);
          rateLimitStore.set(key, entry);
        }

        return originalSend.call(this, data);
      };

      return next();
    } catch (error) {
      logger.error("Rate limit middleware error - bypassing", {
        error: error instanceof Error ? error.message : String(error),
        endpoint: req.path
      });

      // On error, bypass rate limiting to keep API operational
      next();
    }
  };
};

/**
 * Générateur de clé par défaut
 * Uses clientIp if available (from IP extraction middleware), otherwise falls back to req.ip
 */
function defaultKeyGenerator(req: Request): string {
  const user = (req as any).user;
  const ip = (req as any).clientIp || req.ip;
  return user ? `user_${user.uid}` : `ip_${ip}`;
}

export { rateLimitStore };
