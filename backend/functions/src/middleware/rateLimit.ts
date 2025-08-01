import {NextFunction, Request, Response} from "express";
import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import { collections } from "../config/database";

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

// @ts-ignore
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
      const rateLimitRef = collections.rate_limits.doc(key);
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

      // Log détaillé pour debugging
      logger.info("Rate limit check", {
        key,
        hitCount,
        maxRequests,
        remaining: maxRequests - hitCount,
        windowMs,
        resetTime: resetTime.toISOString(),
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        endpoint: req.path,
        method: req.method,
        environment: process.env.APP_ENV || 'development'
      });

      // Vérifier la limite
      if (hitCount > maxRequests) {
        // Log de l'abus avec plus de détails
        logger.warn("Rate limit exceeded", {
          key,
          hitCount,
          maxRequests,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          endpoint: req.path,
          method: req.method,
          timeUntilReset: Math.ceil((resetTime.getTime() - now.getTime()) / 1000),
          environment: process.env.APP_ENV || 'development'
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

      return next();
    } catch (error) {
      logger.error("Rate limit error", {error});
      // En cas d'erreur, continuer sans limitation
      next();
    }
  };
};

/**
 * Configurations prédéfinies adaptées selon l'environnement
 */
const isDevelopment = process.env.APP_ENV === 'development';

export const rateLimitConfigs = {
  // Limitation générale
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: isDevelopment ? 1000 : 100, // Plus permissif en dev
    message: "Trop de requêtes depuis cette IP",
  },

  // Limitation pour l'authentification (login)
  auth: {
    windowMs: isDevelopment ? 1 * 60 * 1000 : 5 * 60 * 1000, // 1 min en dev, 5 min en prod
    maxRequests: isDevelopment ? 100 : 5, // 100 en dev, 5 en prod
    keyGenerator: (req: Request) => `login_${req.ip}_${isDevelopment ? 'dev' : 'prod'}`,
    message: "Trop de tentatives de connexion",
    skipSuccessfulRequests: true,
  },

  // Limitation pour l'inscription (register)
  register: {
    windowMs: isDevelopment ? 1 * 60 * 1000 : 5 * 60 * 1000, // 1 min en dev, 5 min en prod
    maxRequests: isDevelopment ? 50 : 3, // 50 en dev, 3 en prod
    keyGenerator: (req: Request) => `register_${req.ip}_${isDevelopment ? 'dev' : 'prod'}`,
    message: "Trop de tentatives d'inscription",
  },

  // Limitation pour les tokens de rafraîchissement
  refreshToken: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 50 : 10,
    message: "Trop de tentatives de rafraîchissement de token",
  },

  // Limitation pour la récupération de mot de passe
  forgotPassword: {
    windowMs: 60 * 60 * 1000, // 1 heure
    maxRequests: isDevelopment ? 20 : 3,
    message: "Trop de demandes de récupération de mot de passe",
  },

  // Limitation pour la réinitialisation de mot de passe
  resetPassword: {
    windowMs: 60 * 60 * 1000, // 1 heure
    maxRequests: isDevelopment ? 20 : 5,
    message: "Trop de tentatives de réinitialisation",
  },

  // Limitation pour la vérification d'email
  emailVerification: {
    windowMs: 60 * 60 * 1000, // 1 heure
    maxRequests: isDevelopment ? 50 : 10,
    message: "Trop de demandes de vérification d'email",
  },

  // Limitation pour l'envoi de vérification d'email
  sendEmailVerification: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: isDevelopment ? 20 : 3,
    message: "Trop de demandes d'envoi de vérification",
  },

  // Limitation pour le check-in
  checkIn: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 50 : 10,
    message: "Trop de tentatives de check-in",
  },

  // Limitation pour la création d'événements
  createEvent: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 100 : 20,
    message: "Trop de créations d'événements",
  },

  // Limitation pour la création d'utilisateurs
  createUser: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 50 : 10,
    message: "Trop de créations d'utilisateurs",
  },

  // Limitation pour les invitations
  invitations: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 20 : 5,
    message: "Trop de tentatives d'acceptation d'invitation",
  },

  // Limitation pour la génération de rapports
  generateReport: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 100 : 20,
    message: "Trop de générations de rapports",
  },

  // Limitation pour l'envoi de notifications
  sendNotification: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 200 : 50,
    message: "Trop d'envois de notifications",
  },

  // Limitation pour l'envoi en masse de notifications
  sendBulkNotification: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: isDevelopment ? 50 : 10,
    message: "Trop d'envois en masse",
  },

  // Limitation pour les tests de notifications
  testNotification: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 50 : 10,
    message: "Trop de tests de notifications",
  },

  // Limitation pour les prédictions ML
  mlPredict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 500 : 100,
    message: "Trop de prédictions ML",
  },

  // Limitation pour les recommandations ML
  mlRecommendations: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 200 : 50,
    message: "Trop de demandes de recommandations",
  },

  // Limitation pour la détection d'anomalies
  mlAnomalies: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 100 : 20,
    message: "Trop de détections d'anomalies",
  },

  // Limitation pour les insights ML
  mlInsights: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 150 : 30,
    message: "Trop de demandes d'insights",
  },

  // Limitation pour l'entraînement de modèles
  mlTrain: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: isDevelopment ? 20 : 3,
    message: "Trop d'entraînements de modèles",
  },

  // Limitation pour les tests de prédiction ML
  mlTestPredict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 50 : 10,
    message: "Trop de tests de prédiction",
  },

  // Limitation pour les prédictions en lot
  mlBatchPredict: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: isDevelopment ? 20 : 5,
    message: "Trop de prédictions en lot",
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

  const oldEntries = await collections.rate_limits
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
