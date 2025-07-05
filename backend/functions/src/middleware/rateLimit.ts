// ==========================================
// 3. RATE LIMIT - rateLimit.ts
// ==========================================

import {Request, Response, NextFunction} from "express";
import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";

const db = getFirestore();

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

interface RateLimitInfo {
  totalHits: number;
  totalRequests: number;
  resetTime: Date;
  remainingPoints?: number;
}

/**
 * Middleware de limitation de taux
 */
export const rateLimit = (config: RateLimitConfig) => {
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
    try {
      const key = keyGenerator(req);
      const now = new Date();
      const resetTime = new Date(Math.ceil(now.getTime() / windowMs) * windowMs);

      // Récupérer ou créer l'entrée de limitation
      const rateLimitRef = db.collection("rate_limits").doc(key);
      const rateLimitDoc = await rateLimitRef.get();

      let hitCount = 0;
      let totalRequests = 0;

      if (rateLimitDoc.exists) {
        const data = rateLimitDoc.data()!;
        if (data.resetTime.toDate() > now) {
          hitCount = data.hitCount || 0;
          totalRequests = data.totalRequests || 0;
        }
      }

      // Incrémenter le compteur
      hitCount++;
      totalRequests++;

      // Sauvegarder l'état
      await rateLimitRef.set({
        hitCount,
        totalRequests,
        resetTime,
        lastRequest: now,
      }, {merge: true});

      // Vérifier la limite
      if (hitCount > maxRequests) {
        // Log de l'abus
        logger.warn("Rate limit exceeded", {
          key,
          hitCount,
          maxRequests,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          endpoint: req.path,
        });

        // Ajouter les headers de limitation
        if (standardHeaders) {
          res.set({
            "RateLimit-Limit": maxRequests.toString(),
            "RateLimit-Remaining": "0",
            "RateLimit-Reset": resetTime.getTime().toString(),
          });
        }

        if (legacyHeaders) {
          res.set({
            "X-RateLimit-Limit": maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetTime.getTime().toString(),
          });
        }

        return res.status(429).json({
          success: false,
          error: "RATE_LIMIT_EXCEEDED",
          message,
          retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000),
        });
      }

      // Ajouter les headers informatifs
      const remaining = Math.max(0, maxRequests - hitCount);

      if (standardHeaders) {
        res.set({
          "RateLimit-Limit": maxRequests.toString(),
          "RateLimit-Remaining": remaining.toString(),
          "RateLimit-Reset": resetTime.getTime().toString(),
        });
      }

      if (legacyHeaders) {
        res.set({
          "X-RateLimit-Limit": maxRequests.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": resetTime.getTime().toString(),
        });
      }

      // Middleware pour gérer les réponses
      const originalSend = res.send;
      res.send = function(data) {
        const shouldCount = !(
          (skipSuccessfulRequests && res.statusCode < 400) ||
          (skipFailedRequests && res.statusCode >= 400)
        );

        if (!shouldCount) {
          // Décrémenter si on ne doit pas compter cette requête
          rateLimitRef.update({
            hitCount: Math.max(0, hitCount - 1),
          }).catch((error) => {
            logger.error("Failed to decrement rate limit", {error});
          });
        }

        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      logger.error("Rate limit error", {error});
      // En cas d'erreur, continuer sans limitation
      next();
    }
  };
};

/**
 * Configurations prédéfinies
 */
export const rateLimitConfigs = {
  // Limitation générale
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: "Trop de requêtes depuis cette IP",
  },

  // Limitation pour l'authentification
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: (req: Request) => `auth_${req.ip}`,
    message: "Trop de tentatives de connexion",
  },

  // Limitation pour les uploads
  upload: {
    windowMs: 60 * 60 * 1000, // 1 heure
    maxRequests: 20,
    message: "Quota d'upload dépassé",
  },

  // Limitation par utilisateur
  perUser: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      return user ? `user_${user.uid}` : `ip_${req.ip}`;
    },
  },
};

/**
 * Générateur de clé par défaut
 */
function defaultKeyGenerator(req: Request): string {
  const user = (req as any).user;
  return user ? `user_${user.uid}` : `ip_${req.ip}`;
}

/**
 * Nettoyer les anciennes entrées de limitation
 */
export const cleanupRateLimits = async (): Promise<void> => {
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h

  const oldEntries = await db.collection("rate_limits")
    .where("resetTime", "<", cutoffTime)
    .limit(100)
    .get();

  if (!oldEntries.empty) {
    const batch = db.batch();
    oldEntries.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    logger.info(`Cleaned up ${oldEntries.size} old rate limit entries`);
  }
};
