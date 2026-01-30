import { NextFunction, Request, Response } from "express";
import { logger } from "firebase-functions";
import { collections } from "../config/database";
import { db } from "../config";



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
// Track if Firestore is ready for rate limiting
let firestoreReady = false;
let firestoreCheckAttempts = 0;
const MAX_FIRESTORE_CHECK_ATTEMPTS = 3;

/**
 * Check if Firestore is ready for rate limiting operations
 * Returns true if ready, false if we should skip rate limiting
 */
async function isFirestoreReadyForRateLimiting(): Promise<boolean> {
  // If already confirmed ready, return immediately
  if (firestoreReady) {
    return true;
  }

  // If we've tried too many times, assume it's ready to avoid infinite skipping
  if (firestoreCheckAttempts >= MAX_FIRESTORE_CHECK_ATTEMPTS) {
    firestoreReady = true;
    logger.info('Firestore assumed ready after max check attempts', {
      attempts: firestoreCheckAttempts
    });
    return true;
  }

  try {
    firestoreCheckAttempts++;
    
    // Quick test: try to get a document with short timeout
    const testPromise = collections.rate_limits.limit(1).get();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firestore readiness check timeout')), 1000)
    );
    
    await Promise.race([testPromise, timeoutPromise]);
    
    firestoreReady = true;
    logger.info('✅ Firestore ready for rate limiting', {
      attempts: firestoreCheckAttempts
    });
    return true;
  } catch (error) {
    logger.warn('⚠️ Firestore not ready for rate limiting, will skip', {
      attempts: firestoreCheckAttempts,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

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
    // En mode développement, désactiver le rate limiting si problème de connexion
    const isDevelopment = process.env.APP_ENV === 'development';
    
    // 🚨 PRODUCTION FIX: Skip rate limiting on health check endpoints to avoid cold start issues
    // Check both the path and the full URL to catch all health check variations
    const isHealthCheck = req.path.includes('/health') || 
                         req.url.includes('/health') || 
                         req.originalUrl?.includes('/health');
    
    if (isHealthCheck) {
      logger.debug("Rate limiting bypassed for health check endpoint", {
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl,
        method: req.method
      });
      return next();
    }

    // 🚨 CRITICAL FIX: Check if Firestore is ready before attempting rate limiting
    const fsReady = await isFirestoreReadyForRateLimiting();
    if (!fsReady) {
      logger.warn('Rate limiting skipped - Firestore not ready (cold start)', {
        path: req.path,
        method: req.method,
        attempts: firestoreCheckAttempts
      });
      return next();
    }

    try {
      const key = keyGenerator(req);
      const now = new Date();
      const resetTime = new Date(Math.ceil(now.getTime() / windowMs) * windowMs);

      // Récupérer ou créer l'entrée de limitation avec timeout
      const rateLimitRef = collections.rate_limits.doc(key);
      
      // 🚨 PRODUCTION FIX: Add timeout to Firestore operations (increased to 5s for cold starts)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firestore timeout in rate limit')), 5000); // Increased from 2s to 5s
      });
      
      const rateLimitDoc = await Promise.race([
        rateLimitRef.get(),
        timeoutPromise
      ]) as FirebaseFirestore.DocumentSnapshot;

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
      }, { merge: true });

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
      res.send = function (data) {
        const shouldCount = !(
          (skipSuccessfulRequests && res.statusCode < 400) ||
          (skipFailedRequests && res.statusCode >= 400)
        );

        if (!shouldCount) {
          // Décrémenter si on ne doit pas compter cette requête
          rateLimitRef.update({
            hitCount: Math.max(0, hitCount - 1),
          }).catch((error) => {
            logger.error("Failed to decrement rate limit", { error });
          });
        }

        return originalSend.call(this, data);
      };

      return next();
    } catch (error) {
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
        environment: process.env.APP_ENV || 'development'
      };
      
      logger.error("Rate limit middleware error - bypassing rate limiting", errorDetails);

      // 🚨 CRITICAL: Always bypass rate limiting on error to prevent API outage
      // Better to have no rate limiting than to block all requests
      if (isDevelopment) {
        logger.warn("Rate limiting bypassed due to error in development mode", {
          endpoint: req.path,
          method: req.method,
          error: error instanceof Error ? error.message : String(error)
        });
      } else {
        logger.error("Rate limiting bypassed due to error in PRODUCTION - investigate immediately", {
          endpoint: req.path,
          method: req.method,
          error: error instanceof Error ? error.message : String(error),
          alert: 'RATE_LIMITING_FAILURE'
        });
      }

      // Continue without limitation to prevent API outage
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
    keyGenerator: (req: Request) => {
      const ip = (req as any).clientIp || req.ip;
      return `login_${ip}_${isDevelopment ? 'dev' : 'prod'}`;
    },
    message: "Trop de tentatives de connexion",
    skipSuccessfulRequests: true,
  },

  // Limitation pour l'inscription (register)
  register: {
    windowMs: isDevelopment ? 1 * 60 * 1000 : 5 * 60 * 1000, // 1 min en dev, 5 min en prod
    maxRequests: isDevelopment ? 50 : 3, // 50 en dev, 3 en prod
    keyGenerator: (req: Request) => {
      const ip = (req as any).clientIp || req.ip;
      return `register_${ip}_${isDevelopment ? 'dev' : 'prod'}`;
    },
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
    keyGenerator: (req: Request) => {
      const ip = (req as any).clientIp || req.ip;
      return `email_verification_attempts_${ip}_${isDevelopment ? 'dev' : 'prod'}`;
    },
    message: "Trop de tentatives de vérification d'email. Limite: 10 par heure par IP.",
  },

  // Limitation pour l'envoi de vérification d'email (3 per hour per email)
  sendEmailVerification: {
    windowMs: 60 * 60 * 1000, // 1 heure
    maxRequests: isDevelopment ? 20 : 3,
    keyGenerator: (req: Request) => {
      const ip = (req as any).clientIp || req.ip;
      return `send_email_verification_${req.body?.email || ip}_${isDevelopment ? 'dev' : 'prod'}`;
    },
    message: "Trop de demandes d'envoi de vérification d'email. Limite: 3 par heure par email.",
  },

  // Limitation pour les tentatives de vérification d'email (10 per hour per IP)
  emailVerificationAttempts: {
    windowMs: 60 * 60 * 1000, // 1 heure
    maxRequests: isDevelopment ? 50 : 10,
    keyGenerator: (req: Request) => {
      const ip = (req as any).clientIp || req.ip;
      return `email_verification_attempts_${ip}_${isDevelopment ? 'dev' : 'prod'}`;
    },
    message: "Trop de tentatives de vérification d'email. Limite: 10 par heure par IP.",
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

  // Limitation pour les réservations publiques
  publicBooking: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 50 : 10,
    keyGenerator: (req: Request) => {
      const ip = (req as any).clientIp || req.ip;
      return `public_booking_${ip}_${isDevelopment ? 'dev' : 'prod'}`;
    },
    message: "Trop de tentatives de réservation",
  },

  // Limitation par défaut pour les endpoints généraux
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 200 : 60,
    message: "Trop de requêtes",
  },

  // Limitation par utilisateur
  perUser: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      const ip = (req as any).clientIp || req.ip;
      return user ? `user_${user.uid}` : `ip_${ip}`;
    },
  },

  // Limitation pour les opérations de pointage (clock-in/clock-out)
  presenceClocking: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 50 : 5,
    keyGenerator: (req: Request) => {
      const employeeId = req.params.employeeId || 'unknown';
      const user = (req as any).user;
      const ip = (req as any).clientIp || req.ip;
      // Note: Role checking now requires tenant context - using simplified key generation
      // TODO: Update to use tenant-based role checking
      return user?.uid ? `user_clocking_${user.uid}` : `clocking_${ip}_${employeeId}`;
    },
    message: "Trop de tentatives de pointage",
  },

  // Limitation pour les opérations de gestion de présence
  presenceManagement: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 100 : 20,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      const ip = (req as any).clientIp || req.ip;
      return user?.uid ? `presence_mgmt_${user.uid}` : `presence_mgmt_ip_${ip}`;
    },
    message: "Trop d'opérations de gestion de présence",
  },

  // Limitation pour la génération de rapports de présence
  presenceReports: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: isDevelopment ? 20 : 3,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      const ip = (req as any).clientIp || req.ip;
      return user?.uid ? `presence_report_${user.uid}` : `presence_report_ip_${ip}`;
    },
    message: "Trop de demandes de rapports de présence",
  },

  // Limitation pour les validations de présence
  presenceValidation: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 50 : 10,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      const ip = (req as any).clientIp || req.ip;
      return user?.uid ? `presence_validation_${user.uid}` : `presence_validation_ip_${ip}`;
    },
    message: "Trop de validations de présence",
  },

  // Limitation pour les corrections de présence
  presenceCorrection: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isDevelopment ? 30 : 5,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      const ip = (req as any).clientIp || req.ip;
      return user?.uid ? `presence_correction_${user.uid}` : `presence_correction_ip_${ip}`;
    },
    message: "Trop de corrections de présence",
  },
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
