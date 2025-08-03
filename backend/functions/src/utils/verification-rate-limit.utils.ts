// backend/functions/src/utils/verification-rate-limit.utils.ts

import { Request } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { collections } from "../config/database";

const db = getFirestore();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string;
}

/**
 * Utilitaires spécialisés pour la limitation de taux des opérations de vérification
 */
export class VerificationRateLimitUtils {
  
  /**
   * Vérifie et applique la limitation de taux pour l'envoi d'emails de vérification
   * Limite: 3 emails par heure par adresse email
   */
  static async checkEmailSendingRateLimit(
    email: string,
    ipAddress: string
  ): Promise<RateLimitResult> {
    const isDevelopment = process.env.APP_ENV === 'development';
    const windowMs = 60 * 60 * 1000; // 1 heure
    const maxRequests = isDevelopment ? 20 : 3;
    
    // Utiliser l'email comme clé principale, avec fallback sur IP
    const key = `send_email_verification_${email}_${isDevelopment ? 'dev' : 'prod'}`;
    
    return await this.checkRateLimit(key, windowMs, maxRequests, {
      email,
      ipAddress,
      operation: 'email_sending'
    });
  }

  /**
   * Vérifie et applique la limitation de taux pour les tentatives de vérification
   * Limite: 10 tentatives par heure par IP
   */
  static async checkVerificationAttemptsRateLimit(
    ipAddress: string,
    userAgent?: string
  ): Promise<RateLimitResult> {
    const isDevelopment = process.env.APP_ENV === 'development';
    const windowMs = 60 * 60 * 1000; // 1 heure
    const maxRequests = isDevelopment ? 50 : 10;
    
    const key = `email_verification_attempts_${ipAddress}_${isDevelopment ? 'dev' : 'prod'}`;
    
    return await this.checkRateLimit(key, windowMs, maxRequests, {
      ipAddress,
      userAgent,
      operation: 'verification_attempts'
    });
  }

  /**
   * Vérifie et applique la limitation de taux pour les demandes de renvoi
   * Combine les limites par email et par IP
   */
  static async checkResendRateLimit(
    email: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{
    emailLimit: RateLimitResult;
    ipLimit: RateLimitResult;
    allowed: boolean;
    mostRestrictive: RateLimitResult;
  }> {
    const [emailLimit, ipLimit] = await Promise.all([
      this.checkEmailSendingRateLimit(email, ipAddress),
      this.checkVerificationAttemptsRateLimit(ipAddress, userAgent)
    ]);

    const allowed = emailLimit.allowed && ipLimit.allowed;
    const mostRestrictive = !emailLimit.allowed ? emailLimit : ipLimit;

    return {
      emailLimit,
      ipLimit,
      allowed,
      mostRestrictive
    };
  }

  /**
   * Logique de base pour vérifier la limitation de taux
   */
  private static async checkRateLimit(
    key: string,
    windowMs: number,
    maxRequests: number,
    metadata: Record<string, any> = {}
  ): Promise<RateLimitResult> {
    try {
      const now = new Date();
      const resetTime = new Date(Math.ceil(now.getTime() / windowMs) * windowMs);
      const windowStart = new Date(now.getTime() - windowMs);

      // Nettoyer les anciennes entrées
      await this.cleanupOldEntries(key, windowStart);

      // Compter les requêtes actuelles dans la fenêtre
      const currentRequests = await collections.rate_limits
        .where("key", "==", key)
        .where("timestamp", ">=", windowStart)
        .get();

      const currentCount = currentRequests.size;
      const remaining = Math.max(0, maxRequests - currentCount);

      // Log détaillé pour debugging
      logger.info("Verification rate limit check", {
        key,
        currentCount,
        maxRequests,
        remaining,
        windowMs,
        resetTime: resetTime.toISOString(),
        metadata,
        environment: process.env.APP_ENV || 'development'
      });

      // Vérifier si la limite est dépassée
      if (currentCount >= maxRequests) {
        const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000);
        
        logger.warn("Verification rate limit exceeded", {
          key,
          currentCount,
          maxRequests,
          retryAfter,
          metadata,
          environment: process.env.APP_ENV || 'development'
        });

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter
        };
      }

      // Enregistrer cette requête
      await collections.rate_limits.add({
        key,
        timestamp: now,
        createdAt: now,
        metadata
      });

      return {
        allowed: true,
        remaining: remaining - 1, // -1 car on vient d'ajouter cette requête
        resetTime
      };

    } catch (error) {
      logger.error("Rate limit check error", {
        key,
        error: error instanceof Error ? error.message : String(error),
        metadata
      });
      
      // En cas d'erreur, permettre la requête (fail-open)
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: new Date(Date.now() + windowMs)
      };
    }
  }

  /**
   * Nettoie les anciennes entrées de limitation de taux
   */
  private static async cleanupOldEntries(key: string, cutoffTime: Date): Promise<void> {
    try {
      const oldEntries = await collections.rate_limits
        .where("key", "==", key)
        .where("timestamp", "<", cutoffTime)
        .limit(50) // Limiter pour éviter les timeouts
        .get();

      if (!oldEntries.empty) {
        const batch = db.batch();
        oldEntries.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        logger.debug(`Cleaned up ${oldEntries.size} old rate limit entries for key: ${key}`);
      }
    } catch (error) {
      logger.warn("Failed to cleanup old rate limit entries", {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Génère une réponse d'erreur standardisée pour les limites de taux dépassées
   */
  static generateRateLimitErrorResponse(
    result: RateLimitResult,
    operation: 'email_sending' | 'verification_attempts' | 'resend'
  ): {
    success: false;
    error: string;
    message: string;
    retryAfter: number;
    data: {
      remaining: number;
      resetTime: string;
      operation: string;
    };
  } {
    const messages = {
      email_sending: "Trop de demandes d'envoi de vérification d'email. Limite: 3 par heure par email.",
      verification_attempts: "Trop de tentatives de vérification d'email. Limite: 10 par heure par IP.",
      resend: "Trop de demandes de renvoi de vérification. Veuillez patienter avant de réessayer."
    };

    return {
      success: false,
      error: "RATE_LIMIT_EXCEEDED",
      message: messages[operation],
      retryAfter: result.retryAfter || 0,
      data: {
        remaining: result.remaining,
        resetTime: result.resetTime.toISOString(),
        operation
      }
    };
  }

  /**
   * Génère une réponse d'erreur pour les limites multiples (email + IP)
   */
  static generateMultipleRateLimitErrorResponse(
    emailLimit: RateLimitResult,
    ipLimit: RateLimitResult
  ): {
    success: false;
    error: string;
    message: string;
    retryAfter: number;
    data: {
      emailLimit: {
        remaining: number;
        resetTime: string;
      };
      ipLimit: {
        remaining: number;
        resetTime: string;
      };
      mostRestrictive: string;
    };
  } {
    const mostRestrictive = !emailLimit.allowed ? 'email' : 'ip';
    const restrictiveLimit = !emailLimit.allowed ? emailLimit : ipLimit;
    
    const message = !emailLimit.allowed 
      ? "Trop de demandes d'envoi pour cette adresse email. Limite: 3 par heure."
      : "Trop de tentatives depuis cette adresse IP. Limite: 10 par heure.";

    return {
      success: false,
      error: "RATE_LIMIT_EXCEEDED",
      message,
      retryAfter: restrictiveLimit.retryAfter || 0,
      data: {
        emailLimit: {
          remaining: emailLimit.remaining,
          resetTime: emailLimit.resetTime.toISOString()
        },
        ipLimit: {
          remaining: ipLimit.remaining,
          resetTime: ipLimit.resetTime.toISOString()
        },
        mostRestrictive
      }
    };
  }

  /**
   * Obtient les statistiques de limitation de taux pour une clé donnée
   */
  static async getRateLimitStats(
    key: string,
    windowMs: number = 60 * 60 * 1000
  ): Promise<{
    currentCount: number;
    windowStart: Date;
    windowEnd: Date;
    oldestRequest?: Date;
    newestRequest?: Date;
  }> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - windowMs);

      const requests = await collections.rate_limits
        .where("key", "==", key)
        .where("timestamp", ">=", windowStart)
        .orderBy("timestamp", "asc")
        .get();

      const timestamps = requests.docs.map(doc => doc.data().timestamp.toDate());

      return {
        currentCount: requests.size,
        windowStart,
        windowEnd: now,
        oldestRequest: timestamps.length > 0 ? timestamps[0] : undefined,
        newestRequest: timestamps.length > 0 ? timestamps[timestamps.length - 1] : undefined
      };

    } catch (error) {
      logger.error("Failed to get rate limit stats", {
        key,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        currentCount: 0,
        windowStart: new Date(Date.now() - windowMs),
        windowEnd: new Date()
      };
    }
  }

  /**
   * Nettoie toutes les anciennes entrées de limitation de taux
   * Utile pour la maintenance périodique
   */
  static async cleanupAllOldEntries(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
      
      const oldEntries = await collections.rate_limits
        .where("timestamp", "<", cutoffTime)
        .limit(100) // Traiter par lots pour éviter les timeouts
        .get();

      if (oldEntries.empty) {
        return 0;
      }

      const batch = db.batch();
      oldEntries.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      logger.info(`Cleaned up ${oldEntries.size} old rate limit entries`);
      return oldEntries.size;

    } catch (error) {
      logger.error("Failed to cleanup all old rate limit entries", {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }
}